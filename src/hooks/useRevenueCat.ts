import { useEffect, useMemo, useState } from "react";
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import {
  configureRevenueCat,
  getOfferings,
  getCustomerInfo,
  isEntitled,
  onCustomerInfoChanged,
  purchasePackage,
  restorePurchases,
  saveSubscriptionToFirestore,
} from "../lib/revenuecat";

type State = {
  initialized: boolean;
  isPro: boolean;
  offerings: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  loading: boolean;
  error?: string;
  purchase(pkg: PurchasesPackage): Promise<void>;
  restore(): Promise<void>;
};

export function useRevenueCat(appUserID?: string): State {
  const [initialized, setInitialized] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let unsubscribe: any;

    (async () => {
      try {
        await configureRevenueCat(appUserID);

        // initial entitlement
        const info = await getCustomerInfo();
        setIsPro(await isEntitled(info));
        
        // Save initial subscription data to Firestore
        if (info) {
          try {
            await saveSubscriptionToFirestore(info);
          } catch (error) {
            console.warn('Failed to save initial subscription data:', error);
            // Don't throw - continue with app functionality
          }
        }

        // listen for entitlement changes
        unsubscribe = onCustomerInfoChanged(async (updated) => {
          console.log('useRevenueCat: CustomerInfo changed, checking entitlements');
          const newIsProState = await isEntitled(updated);
          console.log('useRevenueCat: CustomerInfo listener setting isPro to:', newIsProState);
          setIsPro(newIsProState);
          
          // Save updated subscription data to Firestore
          try {
            await saveSubscriptionToFirestore(updated);
          } catch (error) {
            console.warn('Failed to save updated subscription data:', error);
            // Don't throw - continue with app functionality
          }
        });

        // load offerings
        const offs = await getOfferings();
        setOfferings(offs.current ?? null);
        
        // 🐛 DEBUG: Quick sanity check for offerings/packages
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        const debugOffs = await Purchases.getOfferings();
        console.log("🔍 RC packages:", debugOffs.current?.availablePackages?.map(p => ({
          id: p.identifier, 
          price: p.product.priceString,
          title: p.product.title
        })));
        console.log("🔍 RC offerings current:", debugOffs.current?.identifier);
        console.log("🔍 RC offerings all:", Object.keys(debugOffs.all));
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setInitialized(true);
      }
    })();

    return () => {
      // Handle different possible return types from addCustomerInfoUpdateListener
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (unsubscribe && typeof unsubscribe.remove === 'function') {
        unsubscribe.remove();
      }
    };
  }, [appUserID]);

  const availablePackages = useMemo(
    () => offerings?.availablePackages ?? [],
    [offerings]
  );

  const purchase = async (pkg: PurchasesPackage) => {
    setLoading(true);
    setError(undefined);
    try {
      console.log('useRevenueCat: Starting purchase for package:', pkg.identifier);
      const info = await purchasePackage(pkg);
      console.log('useRevenueCat: Purchase completed, checking entitlements');
      const newIsProState = await isEntitled(info);
      console.log('useRevenueCat: Setting isPro to:', newIsProState);
      setIsPro(newIsProState);
    } catch (e: any) {
      console.error('useRevenueCat: Purchase error:', e);
      // user cancels or error
      setError(e?.userCancelled ? undefined : e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const info = await restorePurchases();
      setIsPro(await isEntitled(info));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return {
    initialized,
    isPro,
    offerings,
    availablePackages,
    loading,
    error,
    purchase,
    restore,
  };
}