import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSignUp = () => {
    router.replace('/(tabs)/')
  }

  const inputStyle = (field: string) => [
    styles.inputWrapper,
    focusedField === field && styles.inputWrapperFocused,
  ]

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <View style={styles.logoMark}>
                <View style={styles.logoInner} />
              </View>
              <Text style={styles.logoText}>Vyne</Text>
            </View>
            <Text style={styles.headerTagline}>Join thousands of teams</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create your workspace</Text>
            <Text style={styles.cardSubtitle}>Set up your company on Vyne in 60 seconds</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full name</Text>
              <View style={inputStyle('name')}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={focusedField === 'name' ? '#6C47FF' : '#9B9BB4'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Preet Raval"
                  placeholderTextColor="#C4C4D4"
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Company Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Company name</Text>
              <View style={inputStyle('company')}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={focusedField === 'company' ? '#6C47FF' : '#9B9BB4'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Acme Corp"
                  placeholderTextColor="#C4C4D4"
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={company}
                  onChangeText={setCompany}
                  onFocus={() => setFocusedField('company')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Work email</Text>
              <View style={inputStyle('email')}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? '#6C47FF' : '#9B9BB4'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="you@company.com"
                  placeholderTextColor="#C4C4D4"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={inputStyle('password')}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? '#6C47FF' : '#9B9BB4'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#C4C4D4"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#9B9BB4"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms note */}
            <Text style={styles.termsText}>
              By signing up you agree to Vyne's{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

            {/* Create Button */}
            <TouchableOpacity style={styles.createButton} onPress={handleSignUp} activeOpacity={0.85}>
              <Text style={styles.createButtonText}>Start free trial</Text>
              <Ionicons name="sparkles" size={16} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C2E',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#1C1C2E',
    paddingTop: 20,
    paddingBottom: 36,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  logoInner: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '45deg' }],
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 14,
    color: '#8888AA',
    letterSpacing: 0.3,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
    minHeight: 600,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C2E',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#6B6B8A',
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D5C',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5FA',
    borderWidth: 1.5,
    borderColor: '#E8E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#6C47FF',
    backgroundColor: '#FAFAFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C2E',
    height: '100%',
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  termsText: {
    fontSize: 12,
    color: '#9B9BB4',
    lineHeight: 18,
    marginBottom: 24,
    marginTop: 4,
  },
  termsLink: {
    color: '#6C47FF',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6C47FF',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  signInText: {
    fontSize: 14,
    color: '#6B6B8A',
  },
  signInLink: {
    fontSize: 14,
    color: '#6C47FF',
    fontWeight: '700',
  },
})
