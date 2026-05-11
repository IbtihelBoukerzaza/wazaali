import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PanResponder,
  Image,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatService } from '../services/chatService';
import { MockChatService } from '../services/mockChatService';
import { colors } from '../utils/colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const ChatBot = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bubbleAnimation] = useState(new Animated.Value(0));
  const [bubblePosition, setBubblePosition] = useState({ x: 20, y: SCREEN_HEIGHT - 320 });

  // ✅ FIX: A ref that always holds the LATEST bubble position.
  // The panResponder closure is created once and never re-reads state,
  // so we mirror state into this ref on every update.
  const bubblePositionRef = useRef({ x: 20, y: SCREEN_HEIGHT - 320 });

  const flatListRef = useRef(null);
  const initialPositionRef = useRef({ x: 20, y: SCREEN_HEIGHT - 320 });
  const touchStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        // ✅ FIX: Read from the ref (always fresh), NOT from bubblePosition state
        // (which would be stale inside this closure).
        initialPositionRef.current = { ...bubblePositionRef.current };
        touchStartRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
      },

      onPanResponderMove: (evt) => {
        const dx = evt.nativeEvent.pageX - touchStartRef.current.x;
        const dy = evt.nativeEvent.pageY - touchStartRef.current.y;

        const newX = initialPositionRef.current.x + dx;
        const newY = initialPositionRef.current.y + dy;

        const clamped = {
          x: Math.max(0, Math.min(SCREEN_WIDTH - 60, newX)),
          y: Math.max(50, Math.min(SCREEN_HEIGHT - 150, newY)),
        };

        // ✅ FIX: Update BOTH the ref (so the next drag starts correctly)
        // and the state (so the bubble re-renders at the new position).
        bubblePositionRef.current = clamped;
        setBubblePosition(clamped);
      },

      onPanResponderRelease: () => {
        // ✅ Nothing needed here — ref is already up to date from onPanResponderMove.
      },
    })
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const toggleChat = () => {
    setIsVisible(!isVisible);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      let botResponse;
      try {
        botResponse = await ChatService.sendMessage(inputText, conversationHistory);
      } catch (apiError) {
        console.log('API failed, using mock service:', apiError);
        botResponse = await MockChatService.sendMessage(inputText, conversationHistory);
      }

      const botMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'عذراً، حدث خطأ. حاول مرة أخرى.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.botMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === 'user' ? styles.userText : styles.botText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  const bubbleScale = bubbleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <>
      {/* Chat Bubble */}
      <View
        style={[
          styles.chatBubble,
          {
            left: I18nManager.isRTL
              ? bubblePosition.x
              : SCREEN_WIDTH - bubblePosition.x - 60,
            top: bubblePosition.y,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={toggleChat}
          activeOpacity={0.8}
          style={styles.bubbleTouchable}
        >
          <Animated.View style={[styles.bubbleContainer, { transform: [{ scale: bubbleScale }] }]}>
            <View style={styles.bubbleMain}>
              <Image
                source={require('../../assets/wazali logo.png')}
                style={styles.bubbleLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.bubbleDot}>
              <Ionicons name="star" size={12} color="black" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Chat Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleChat}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.headerContent}>
                <View style={styles.botAvatar}>
                  <Image
                    source={require('../../assets/wazali logo.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>مساعد وزعلي</Text>
                  <Text style={styles.headerSubtitle}>دائماً هنا للمساعدة</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChat} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              onContentSizeChange={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
            />

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>جاري التفكير...</Text>
              </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="اكتب رسالتك..."
                placeholderTextColor={colors.text.light}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
                textAlign="right"
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() && !isLoading ? 'white' : colors.text.light}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chatBubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
  },
  bubbleTouchable: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleContainer: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  bubbleMain: {
    width: 60,
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleLogo: {
    width: 35,
    height: 35,
  },
  bubbleDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 0,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  botAvatar: {
    width: 45,
    height: 45,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
    fontWeight: '400',
  },
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 6,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  botBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: colors.text.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text.light,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 15,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
    maxHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#667eea',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#e9ecef',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatBot;