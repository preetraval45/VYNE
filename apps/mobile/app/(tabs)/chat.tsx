import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Message = {
  id: string
  sender: string
  initials: string
  avatarColor: string
  text: string
  time: string
  isMe: boolean
}

type Channel = {
  id: string
  name: string
  lastMessage: string
  time: string
  unread: number
  type: 'channel'
}

type DM = {
  id: string
  name: string
  initials: string
  avatarColor: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  type: 'dm'
}

const CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'general',
    lastMessage: 'Sarah: Just pushed the fix to staging',
    time: '2m',
    unread: 3,
    type: 'channel',
  },
  {
    id: 'alerts',
    name: 'alerts',
    lastMessage: 'AI: ENG-43 resolved — 4m 22s response time',
    time: '5m',
    unread: 1,
    type: 'channel',
  },
  {
    id: 'engineering',
    name: 'engineering',
    lastMessage: 'Tony: PR #218 is ready for review',
    time: '18m',
    unread: 0,
    type: 'channel',
  },
  {
    id: 'product',
    name: 'product',
    lastMessage: 'Alex: Q2 roadmap deck is live',
    time: '1h',
    unread: 0,
    type: 'channel',
  },
]

const DMS: DM[] = [
  {
    id: 'sarah',
    name: 'Sarah Kim',
    initials: 'SK',
    avatarColor: '#6C47FF',
    lastMessage: 'Yep, will merge after standup',
    time: '7m',
    unread: 2,
    online: true,
    type: 'dm',
  },
  {
    id: 'tony',
    name: 'Tony Mack',
    initials: 'TM',
    avatarColor: '#00C9A7',
    lastMessage: 'Shared the benchmark results',
    time: '32m',
    unread: 0,
    online: true,
    type: 'dm',
  },
  {
    id: 'alex',
    name: 'Alex Rao',
    initials: 'AR',
    avatarColor: '#FF6B6B',
    lastMessage: 'Can we reschedule tomorrow?',
    time: '2h',
    unread: 0,
    online: false,
    type: 'dm',
  },
]

const MOCK_MESSAGES: Record<string, Message[]> = {
  general: [
    {
      id: '1',
      sender: 'Tony Mack',
      initials: 'TM',
      avatarColor: '#00C9A7',
      text: 'Good morning team! Standup in 10 mins.',
      time: '9:01 AM',
      isMe: false,
    },
    {
      id: '2',
      sender: 'Sarah Kim',
      initials: 'SK',
      avatarColor: '#6C47FF',
      text: 'On it! Also pushed the secrets manager fix to staging.',
      time: '9:03 AM',
      isMe: false,
    },
    {
      id: '3',
      sender: 'You',
      initials: 'PR',
      avatarColor: '#F59E0B',
      text: 'Great work on ENG-43. AI triage worked perfectly.',
      time: '9:05 AM',
      isMe: true,
    },
    {
      id: '4',
      sender: 'Sarah Kim',
      initials: 'SK',
      avatarColor: '#6C47FF',
      text: 'Just pushed the fix to staging',
      time: '9:08 AM',
      isMe: false,
    },
  ],
  alerts: [
    {
      id: '1',
      sender: 'Vyne AI',
      initials: 'AI',
      avatarColor: '#6C47FF',
      text: 'ALERT: ENG-43 detected — Secrets Manager IAM missing policy binding in staging.',
      time: '8:54 AM',
      isMe: false,
    },
    {
      id: '2',
      sender: 'Vyne AI',
      initials: 'AI',
      avatarColor: '#6C47FF',
      text: 'ENG-43 resolved — Root cause identified and patched. Response time: 4m 22s. Production unaffected.',
      time: '8:58 AM',
      isMe: false,
    },
  ],
  engineering: [
    {
      id: '1',
      sender: 'Tony Mack',
      initials: 'TM',
      avatarColor: '#00C9A7',
      text: 'PR #218 is ready for review — LangGraph streaming fix looks solid.',
      time: '8:42 AM',
      isMe: false,
    },
    {
      id: '2',
      sender: 'You',
      initials: 'PR',
      avatarColor: '#F59E0B',
      text: "I'll take a look after standup.",
      time: '8:44 AM',
      isMe: true,
    },
  ],
}

export default function ChatScreen() {
  const [search, setSearch] = useState('')
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'channel' | 'dm' | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState(MOCK_MESSAGES)

  const handleSend = () => {
    if (!newMessage.trim() || !activeChat) return
    const key = activeChat
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'You',
      initials: 'PR',
      avatarColor: '#F59E0B',
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      isMe: true,
    }
    setMessages(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), msg],
    }))
    setNewMessage('')
  }

  if (activeChat) {
    const chatMessages = messages[activeChat] || []
    const chatName =
      activeType === 'channel'
        ? `#${CHANNELS.find(c => c.id === activeChat)?.name}`
        : DMS.find(d => d.id === activeChat)?.name || ''

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => setActiveChat(null)}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.chatHeaderName}>{chatName}</Text>
            <Text style={styles.chatHeaderSub}>
              {activeType === 'channel' ? 'Channel' : 'Direct Message'}
            </Text>
          </View>
          <TouchableOpacity style={styles.chatMoreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map((msg, index) => {
            const showAvatar =
              !msg.isMe &&
              (index === 0 || chatMessages[index - 1]?.sender !== msg.sender)
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  msg.isMe ? styles.messageRowMe : styles.messageRowThem,
                ]}
              >
                {!msg.isMe && (
                  <View
                    style={[
                      styles.msgAvatar,
                      { backgroundColor: showAvatar ? msg.avatarColor : 'transparent' },
                    ]}
                  >
                    {showAvatar && (
                      <Text style={styles.msgAvatarText}>{msg.initials}</Text>
                    )}
                  </View>
                )}
                <View style={msg.isMe ? styles.bubbleMe : styles.bubbleThem}>
                  {!msg.isMe && showAvatar && (
                    <Text style={styles.bubbleSender}>{msg.sender}</Text>
                  )}
                  <Text style={msg.isMe ? styles.bubbleTextMe : styles.bubbleTextThem}>
                    {msg.text}
                  </Text>
                  <Text style={msg.isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.inputBar}>
          <View style={styles.messageInputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder={`Message ${chatName}`}
              placeholderTextColor="#9B9BB4"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="attach" size={20} color="#9B9BB4" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, newMessage.trim() && styles.sendButtonActive]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const filteredChannels = CHANNELS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredDMs = DMS.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeBtn}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color="#9B9BB4" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search channels and people"
          placeholderTextColor="#9B9BB4"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9B9BB4" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
        {/* Channels */}
        <Text style={styles.sectionHeader}>Channels</Text>
        <View style={styles.listCard}>
          {filteredChannels.map((channel, index) => (
            <View key={channel.id}>
              <TouchableOpacity
                style={styles.listRow}
                onPress={() => {
                  setActiveChat(channel.id)
                  setActiveType('channel')
                }}
                activeOpacity={0.7}
              >
                <View style={styles.channelIconWrap}>
                  <Text style={styles.channelHash}>#</Text>
                </View>
                <View style={styles.listRowContent}>
                  <View style={styles.listRowTop}>
                    <Text style={styles.listRowName}>{channel.name}</Text>
                    <Text style={styles.listRowTime}>{channel.time}</Text>
                  </View>
                  <View style={styles.listRowBottom}>
                    <Text style={styles.listRowPreview} numberOfLines={1}>
                      {channel.lastMessage}
                    </Text>
                    {channel.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{channel.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              {index < filteredChannels.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Direct Messages */}
        <Text style={styles.sectionHeader}>Direct Messages</Text>
        <View style={styles.listCard}>
          {filteredDMs.map((dm, index) => (
            <View key={dm.id}>
              <TouchableOpacity
                style={styles.listRow}
                onPress={() => {
                  setActiveChat(dm.id)
                  setActiveType('dm')
                }}
                activeOpacity={0.7}
              >
                <View style={styles.dmAvatarWrap}>
                  <View style={[styles.dmAvatar, { backgroundColor: dm.avatarColor }]}>
                    <Text style={styles.dmAvatarText}>{dm.initials}</Text>
                  </View>
                  <View
                    style={[
                      styles.presenceDot,
                      { backgroundColor: dm.online ? '#4ADE80' : '#9B9BB4' },
                    ]}
                  />
                </View>
                <View style={styles.listRowContent}>
                  <View style={styles.listRowTop}>
                    <Text style={styles.listRowName}>{dm.name}</Text>
                    <Text style={styles.listRowTime}>{dm.time}</Text>
                  </View>
                  <View style={styles.listRowBottom}>
                    <Text style={styles.listRowPreview} numberOfLines={1}>
                      {dm.lastMessage}
                    </Text>
                    {dm.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{dm.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              {index < filteredDMs.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1C2E',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
    backgroundColor: '#1C1C2E',
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    height: '100%',
  },
  listScroll: {
    flex: 1,
    backgroundColor: '#F5F5FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6B8A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  channelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelHash: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6C47FF',
  },
  listRowContent: {
    flex: 1,
  },
  listRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  listRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C2E',
  },
  listRowTime: {
    fontSize: 11,
    color: '#9B9BB4',
  },
  listRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRowPreview: {
    fontSize: 13,
    color: '#6B6B8A',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#6C47FF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  dmAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  dmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Chat view
  chatHeader: {
    backgroundColor: '#1C1C2E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  chatHeaderSub: {
    fontSize: 12,
    color: '#8888AA',
  },
  chatMoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  messageList: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  messageListContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  msgAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  bubbleMe: {
    backgroundColor: '#6C47FF',
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  bubbleThem: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C47FF',
    marginBottom: 3,
  },
  bubbleTextMe: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  bubbleTextThem: {
    fontSize: 14,
    color: '#1C1C2E',
    lineHeight: 20,
  },
  bubbleTimeMe: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeThem: {
    fontSize: 10,
    color: '#9B9BB4',
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    gap: 8,
  },
  messageInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5FA',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C2E',
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  attachBtn: {
    padding: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C4C4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#6C47FF',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
})
