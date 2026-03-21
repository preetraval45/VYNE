import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  dark?: boolean
}

const SIZE_MAP = {
  sm: { mark: 28, inner: 12, innerRadius: 3, text: 20, gap: 7, markRadius: 8 },
  md: { mark: 36, inner: 16, innerRadius: 4, text: 26, gap: 10, markRadius: 10 },
  lg: { mark: 52, inner: 22, innerRadius: 6, text: 36, gap: 14, markRadius: 14 },
}

export default function VyneLogo({ size = 'md', variant = 'full', dark = true }: Props) {
  const s = SIZE_MAP[size]

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.mark,
          {
            width: s.mark,
            height: s.mark,
            borderRadius: s.markRadius,
            marginRight: variant === 'full' ? s.gap : 0,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: s.inner,
              height: s.inner,
              borderRadius: s.innerRadius,
            },
          ]}
        />
      </View>
      {variant === 'full' && (
        <Text
          style={[
            styles.wordmark,
            { fontSize: s.text, color: dark ? '#fff' : '#1C1C2E' },
          ]}
        >
          Vyne
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '45deg' }],
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
})
