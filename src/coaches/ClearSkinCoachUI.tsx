import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { UserSkinData, SkincareRoutine, UserRatings } from '../services/firestoreService';
import { HistoricalProgressData } from '../services/historicalProgressService';

interface ClearSkinCoachUIProps {
  userData: UserSkinData | null;
  userRatings: UserRatings | null;
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  historicalProgress: HistoricalProgressData;
  onBack: () => void;
  onHeaderPress?: () => void;
  panHandlers?: any;
}

export default function ClearSkinCoachUI({ userData, userRatings, amRoutine, pmRoutine, historicalProgress, onBack, onHeaderPress, panHandlers }: ClearSkinCoachUIProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, text: string, isUser: boolean, timestamp: string}>>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const userName = userData?.dreamSkin ? 'there' : 'there';
  const dreamSkin = userData?.dreamSkin || 'Glass';

  const welcomeMessage = `Hey there! 👋 I'm your Clear Skin Coach and I specialize in helping you achieve crystal-clear, blemish-free skin! ✨

I focus specifically on clearing breakouts, reducing acne, and giving you that smooth, radiant complexion you've been dreaming of. Ask me anything about clear skin strategies!`;

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, isLoading]);

  const handleQuickQuestion = (question: string) => {
    setMessage(question);
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    const newUserMessage = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('https://skinai-backend-u6cw.onrender.com/skincare-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          coachType: 'clear_skin',
          userData: userData,
          userRatings: userRatings,
          amRoutine: amRoutine,
          pmRoutine: pmRoutine,
          historicalProgress: historicalProgress
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const coachMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, coachMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again!",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? -50 : 0}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d', '#404040']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topHeader}
          {...(panHandlers || {})}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.titleRow} 
              onPress={onHeaderPress}
              activeOpacity={0.7}
            >
              <Text style={styles.coachTitle}>✨ Clear Skin Coach</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Chat Area */}
        <View style={{ flex: 1 }}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatArea} 
            contentContainerStyle={styles.chatContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
          >
            {/* Welcome Message Bubble */}
            <View style={styles.messageContainer}>
              <LinearGradient
                colors={['#4a4a4a', '#6a6a6a', '#7a7a7a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.messageBubble}
              >
                <Text style={styles.messageText}>{welcomeMessage}</Text>
                <Text style={styles.timestamp}>9:00 AM</Text>
              </LinearGradient>
            </View>

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <View key={msg.id} style={[styles.messageContainer, msg.isUser && styles.userMessageContainer]}>
                {msg.isUser ? (
                  <View style={styles.userMessageBubble}>
                    <Text style={styles.userMessageText}>{msg.text}</Text>
                    <Text style={styles.userTimestamp}>{msg.timestamp}</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={['#4a4a4a', '#6a6a6a', '#7a7a7a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.messageBubble}
                  >
                    <Text style={styles.messageText}>{msg.text}</Text>
                    <Text style={styles.timestamp}>{msg.timestamp}</Text>
                  </LinearGradient>
                )}
              </View>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.messageContainer}>
                <LinearGradient
                  colors={['#4a4a4a', '#6a6a6a', '#7a7a7a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.messageBubble}
                >
                  <Text style={styles.messageText}>Thinking... ✨</Text>
                </LinearGradient>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <BlurView intensity={40} tint="dark" style={styles.inputBlurContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.messageInput}
                placeholder="Ask me anything about clear skin..."
                placeholderTextColor="rgba(160, 160, 160, 0.6)"
                value={message}
                onChangeText={setMessage}
                onFocus={() => {
                  setTimeout(() => {
                    if (scrollViewRef.current) {
                      scrollViewRef.current.scrollToEnd({ animated: true });
                    }
                  }, 100);
                }}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={isLoading || !message.trim()}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isLoading || !message.trim() ? ['#4a4a4a', '#363636'] : ['#6a6a6a', '#8a8a8a']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <Text style={styles.sendText}>⏳</Text>
                  ) : (
                    <Feather name="send" size={16} color="#FFFFFF" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  coachTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  chatArea: {
    flex: 1,
  },
  chatContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 15,
    marginRight: 40,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  userMessageBubble: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 10,
    marginLeft: 40,
    borderWidth: 1,
    borderColor: 'rgba(106, 106, 106, 0.3)',
  },
  userMessageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 12,
  },
  userTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  suggestionsArea: {
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 8,
  },
  quickQuestions: {
    marginBottom: 10,
  },
  quickQuestionsContent: {
    paddingRight: 20,
  },
  quickQuestionCard: {
    borderRadius: 12,
    marginRight: 12,
    width: 180,
    height: 70,
    overflow: 'hidden',
  },
  glassmorphicCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickIcon: {
    marginBottom: 4,
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 120 : 90,
    backgroundColor: '#000000',
  },
  inputBlurContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingLeft: 16,
    fontStyle: 'italic',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 16,
    overflow: 'hidden',
    shadowColor: '#6a6a6a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  sendText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});