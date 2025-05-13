import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Input, Button, Space, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { usePrivy } from '@privy-io/react-auth';
import styles from './index.less';
import { difyService } from '@/services/dify';

const { Title, Text, Paragraph } = Typography;

const suggestionPrompts = [
  {
    title: 'Introduce this project for me?',
    description: 'Get an overview of the project and its main features',
  },
  {
    title: "What's your architecture?",
    description: 'Learn about the system design and components',
  },
  {
    title: 'How does consensus layer play its role?',
    description: 'Understand the consensus mechanism and its importance',
  },
];

const HomePage: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean }>>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [mpcPublicKey, setMpcPublicKey] = useState<string | null>(null);
  
  const { user } = usePrivy();

  useEffect(() => {
    if (user) {
      const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
      if (embeddedWallet) {
        setMpcPublicKey(embeddedWallet.address);
        console.log('MPC Wallet Address:', embeddedWallet.address);
      }
    }
  }, [user]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !mpcPublicKey) {
      if (!mpcPublicKey) {
        message.error('Please connect your wallet first');
      }
      return;
    }

    try {
      setIsLoading(true);
      setShowSuggestions(false);
      
      const userMessage = { content: messageText, isUser: true };
      setMessages(prev => [...prev, userMessage]);

      setInputValue('');
      setCurrentResponse('');

      setMessages(prev => [...prev, { content: '', isUser: false }]);

      await difyService.sendMessage(
        messageText,
        (message) => {
          if (message.conversation_id) {
            setConversationId(message.conversation_id);
          }
          if (message.answer && message.event === 'message') {
            setCurrentResponse(prev => {
              const newResponse = prev + message.answer;
              setMessages(messages => {
                const newMessages = [...messages];
                newMessages[newMessages.length - 1] = {
                  content: newResponse,
                  isUser: false
                };
                return newMessages;
              });
              return newResponse;
            });
          }
        },
        mpcPublicKey,  // 使用 MPC 钱包地址
        conversationId
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (promptTitle: string) => {
    handleSendMessage(promptTitle);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Add debug log for messages state
  useEffect(() => {
    console.log('Messages updated:', messages);
  }, [messages]);

  return (
    <div className={styles.homePageContainer}>
      {/* Title Section - Simplified */}
      <div className={styles.logoTitleSection}>
        <Title level={1} className={styles.mainTitle}>
          AI4SOS Assistant
        </Title>
        <Text className={styles.subTitle}>Your Intelligent Partner</Text>
      </div>

      {/* Messages Section */}
      {!showSuggestions && messages.length > 0 && (
        <div className={styles.messagesContainer}>
          <div style={{ marginTop: 'auto' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.messageItem} ${msg.isUser ? styles.userMessage : styles.botMessage}`}
                style={{
                  opacity: !msg.isUser && index === messages.length - 1 && isLoading ? 0.7 : 1,
                }}
              >
                <div className={styles.messageContent}>
                  {msg.content}
                  {!msg.isUser && index === messages.length - 1 && isLoading && (
                    <span className={styles.cursor}>▋</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Suggestion Card */}
      {showSuggestions && (
        <Row justify="center" align="middle">
          <Col xs={24} sm={24} md={20} lg={20}>
            <Card className={styles.suggestionCard} bordered={false}>
              <Title level={4} className={styles.cardTitle}>
                Try asking:
              </Title>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {suggestionPrompts.map((prompt, index) => (
                  <div 
                    key={index} 
                    className={styles.promptBox}
                    onClick={() => handlePromptClick(prompt.title)}
                  >
                    <Text strong>{prompt.title}</Text>
                    <Paragraph type="secondary" className={styles.promptDescription}>
                      {prompt.description}
                    </Paragraph>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Send Message Bar */}
      <div className={styles.sendMessageBar}>
        <Input
          size="large"
          placeholder="Send a message"
          className={styles.messageInput}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          suffix={
            <Button
              type="text"
              icon={<SendOutlined />}
              className={styles.sendButton}
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading}
            />
          }
        />
      </div>
    </div>
  );
};

export default HomePage;
