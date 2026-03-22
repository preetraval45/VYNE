import React, { useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/lib/stores/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;

    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/");
    } catch {
      // Error is already set in the store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoMark}>
                <View style={styles.logoInner} />
              </View>
              <Text style={styles.logoText}>Vyne</Text>
            </View>
            <Text style={styles.headerTagline}>Your AI Company OS</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your workspace</Text>

            {/* Error Banner */}
            {error && (
              <TouchableOpacity
                style={styles.errorBanner}
                onPress={clearError}
                activeOpacity={0.85}
              >
                <View style={styles.errorLeft}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                <Ionicons name="close" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? "#6C47FF" : "#9B9BB4"}
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
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) clearError();
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? "#6C47FF" : "#9B9BB4"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#C4C4D4"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) clearError();
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#9B9BB4"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                isLoading && styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.signInButtonText}>Sign in</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* SSO Button */}
            <TouchableOpacity style={styles.ssoButton} activeOpacity={0.8}>
              <Ionicons
                name="logo-google"
                size={18}
                color="#444"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.ssoButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>New to Vyne? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                <Text style={styles.signUpLink}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C2E",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#1C1C2E",
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#6C47FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#6C47FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  logoInner: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    transform: [{ rotate: "45deg" }],
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 14,
    color: "#8888AA",
    letterSpacing: 0.3,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    minHeight: 540,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1C1C2E",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#6B6B8A",
    marginBottom: 32,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errorLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D3D5C",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5FA",
    borderWidth: 1.5,
    borderColor: "#E8E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: "#6C47FF",
    backgroundColor: "#FAFAFF",
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#1C1C2E",
    height: "100%",
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: "#6C47FF",
    fontWeight: "600",
  },
  signInButton: {
    backgroundColor: "#6C47FF",
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C47FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E8F0",
  },
  dividerText: {
    fontSize: 13,
    color: "#9B9BB4",
    marginHorizontal: 14,
  },
  ssoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E8E8F0",
    borderRadius: 14,
    height: 54,
    backgroundColor: "#fff",
  },
  ssoButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3D3D5C",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  signUpText: {
    fontSize: 14,
    color: "#6B6B8A",
  },
  signUpLink: {
    fontSize: 14,
    color: "#6C47FF",
    fontWeight: "700",
  },
});
