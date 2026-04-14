import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Platform,
  Modal,
  Vibration,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'

// ─── Types ───────────────────────────────────────────────────────────────────

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
type Category = 'Electronics' | 'Hardware' | 'Software'

type Product = {
  id: string
  name: string
  sku: string
  qty: number
  status: StockStatus
  category: Category
  location: string
}

type Alert = {
  id: string
  name: string
  sku: string
  qty: number
  reorderPoint: number
  urgency: 'critical' | 'warning'
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALL_PRODUCTS: Product[] = [
  { id: '1',  name: 'Raspberry Pi 5 (8GB)',       sku: 'ELC-001', qty: 42,  status: 'in_stock',     category: 'Electronics', location: 'Shelf A2' },
  { id: '2',  name: 'Arduino Mega 2560',           sku: 'ELC-002', qty: 8,   status: 'low_stock',    category: 'Electronics', location: 'Shelf A3' },
  { id: '3',  name: 'USB-C Hub 7-Port',            sku: 'ELC-003', qty: 0,   status: 'out_of_stock', category: 'Electronics', location: 'Shelf B1' },
  { id: '4',  name: 'HDMI 4K Cable 2m',            sku: 'ELC-004', qty: 120, status: 'in_stock',     category: 'Electronics', location: 'Shelf B2' },
  { id: '5',  name: 'M2 SSD 512GB',                sku: 'ELC-005', qty: 6,   status: 'low_stock',    category: 'Electronics', location: 'Shelf A4' },
  { id: '6',  name: 'PCIe Riser Card',             sku: 'HWR-001', qty: 34,  status: 'in_stock',     category: 'Hardware',    location: 'Shelf C1' },
  { id: '7',  name: 'Server Rack 42U',             sku: 'HWR-002', qty: 3,   status: 'low_stock',    category: 'Hardware',    location: 'Warehouse' },
  { id: '8',  name: 'Cat6 Ethernet 10m',           sku: 'HWR-003', qty: 88,  status: 'in_stock',     category: 'Hardware',    location: 'Shelf C2' },
  { id: '9',  name: 'ATX Power Supply 750W',       sku: 'HWR-004', qty: 0,   status: 'out_of_stock', category: 'Hardware',    location: 'Shelf C3' },
  { id: '10', name: 'VYNE Pro — Annual Seat',      sku: 'SWR-001', qty: 215, status: 'in_stock',     category: 'Software',    location: 'Digital' },
  { id: '11', name: 'VYNE Analytics Add-on',       sku: 'SWR-002', qty: 4,   status: 'low_stock',    category: 'Software',    location: 'Digital' },
  { id: '12', name: 'VYNE Enterprise Licence',     sku: 'SWR-003', qty: 0,   status: 'out_of_stock', category: 'Software',    location: 'Digital' },
]

const STOCK_ALERTS: Alert[] = [
  { id: '1', name: 'USB-C Hub 7-Port',      sku: 'ELC-003', qty: 0, reorderPoint: 20, urgency: 'critical' },
  { id: '2', name: 'ATX Power Supply 750W', sku: 'HWR-004', qty: 0, reorderPoint: 10, urgency: 'critical' },
  { id: '3', name: 'Arduino Mega 2560',     sku: 'ELC-002', qty: 8, reorderPoint: 15, urgency: 'warning'  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StockStatus, { color: string; bg: string; label: string; dot: string }> = {
  in_stock:     { color: '#10B981', bg: '#ECFDF5', label: 'In Stock',     dot: '#10B981' },
  low_stock:    { color: '#F59E0B', bg: '#FFFBEB', label: 'Low Stock',    dot: '#F59E0B' },
  out_of_stock: { color: '#EF4444', bg: '#FFF1F1', label: 'Out of Stock', dot: '#EF4444' },
}

const CATEGORY_FILTERS = ['All', 'Electronics', 'Hardware', 'Software'] as const
type CategoryFilter = (typeof CATEGORY_FILTERS)[number]

// ─── QR Scanner Modal ────────────────────────────────────────────────────────

function QRScanModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean
  onClose: () => void
  onScanned: (sku: string) => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    if (visible && !permission?.granted) requestPermission()
    if (visible) setScanned(false)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBarCodeScanned({ data }: { type: string; data: string }) {
    if (scanned) return
    setScanned(true)
    Vibration.vibrate(80)
    onScanned(data)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={scanStyles.container}>
        <SafeAreaView style={scanStyles.header}>
          <TouchableOpacity onPress={onClose} style={scanStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={scanStyles.headerTitle}>Scan Barcode</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        {!permission?.granted ? (
          <View style={scanStyles.permissionBox}>
            <Ionicons name="camera-outline" size={56} color="#6C47FF" />
            <Text style={scanStyles.permissionTitle}>Camera Access Needed</Text>
            <Text style={scanStyles.permissionSub}>
              Allow camera access to scan inventory barcodes and QR codes.
            </Text>
            <TouchableOpacity style={scanStyles.permissionBtn} onPress={requestPermission}>
              <Text style={scanStyles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={scanStyles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'datamatrix'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={scanStyles.overlay}>
              <View style={scanStyles.topOverlay} />
              <View style={scanStyles.middleRow}>
                <View style={scanStyles.sideOverlay} />
                <View style={scanStyles.viewfinder}>
                  <View style={[scanStyles.corner, scanStyles.cornerTL]} />
                  <View style={[scanStyles.corner, scanStyles.cornerTR]} />
                  <View style={[scanStyles.corner, scanStyles.cornerBL]} />
                  <View style={[scanStyles.corner, scanStyles.cornerBR]} />
                  <View style={scanStyles.scanLine} />
                </View>
                <View style={scanStyles.sideOverlay} />
              </View>
              <View style={scanStyles.bottomOverlay}>
                <Text style={scanStyles.scanHint}>
                  {scanned ? '✓ Scanned! Loading product…' : 'Point at a barcode or QR code'}
                </Text>
                {scanned && (
                  <TouchableOpacity style={scanStyles.rescanBtn} onPress={() => setScanned(false)}>
                    <Text style={scanStyles.rescanBtnText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </CameraView>
        )}
      </View>
    </Modal>
  )
}

const scanStyles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#000' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10 },
  closeBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  camera:      { flex: 1 },
  overlay:     { flex: 1 },
  topOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow:   { flexDirection: 'row', height: 260 },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  viewfinder:  { width: 260, height: 260, position: 'relative' },
  scanLine:    { position: 'absolute', top: '50%', left: 12, right: 12, height: 2, backgroundColor: '#6C47FF', opacity: 0.85, borderRadius: 1 },
  corner:      { position: 'absolute', width: 24, height: 24, borderColor: '#6C47FF', borderWidth: 3 },
  cornerTL:    { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR:    { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL:    { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR:    { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  bottomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 28, gap: 14 },
  scanHint:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
  rescanBtn:   { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#6C47FF' },
  rescanBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  permissionSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  permissionBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, backgroundColor: '#6C47FF' },
  permissionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})

// ─── Component ───────────────────────────────────────────────────────────────

export default function ErpScreen() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All')
  const [refreshing, setRefreshing] = useState(false)
  const [products, setProducts] = useState(ALL_PRODUCTS)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setProducts([...ALL_PRODUCTS])
      setRefreshing(false)
    }, 1200)
  }, [])

  function handleScanned(sku: string) {
    setLastScanned(sku)
    setScannerVisible(false)
    // Find matching product and jump to it via search
    const match = ALL_PRODUCTS.find(
      p => p.sku.toLowerCase() === sku.toLowerCase() || p.name.toLowerCase().includes(sku.toLowerCase())
    )
    if (match) {
      setSearch(match.sku)
      setActiveCategory('All')
      Alert.alert('Product Found', `${match.name}\n${match.sku} · ${match.qty} units · ${match.location}`, [
        { text: 'OK' },
      ])
    } else {
      setSearch(sku)
      Alert.alert('Not Found', `No product matched "${sku}". Showing search results.`, [{ text: 'OK' }])
    }
  }

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const totalSKUs  = products.length
  const lowStock   = products.filter(p => p.status === 'low_stock').length
  const outOfStock = products.filter(p => p.status === 'out_of_stock').length

  return (
    <SafeAreaView style={styles.safeArea}>
      <QRScanModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSub}>
            {totalSKUs} SKUs tracked{lastScanned ? ` · Last: ${lastScanned}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.scanBtn} activeOpacity={0.8} onPress={() => setScannerVisible(true)}>
          <Ionicons name="scan-outline" size={20} color="#6C47FF" />
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color="#9B9BB4" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or SKU"
          placeholderTextColor="#9B9BB4"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#9B9BB4" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C47FF"
            colors={['#6C47FF']}
          />
        }
      >
        {/* ── Summary Row ── */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Total SKUs"    value={String(totalSKUs)}  color="#6C47FF" icon="cube-outline" />
          <SummaryCard label="Low Stock"     value={String(lowStock)}   color="#F59E0B" icon="warning-outline" />
          <SummaryCard label="Out of Stock"  value={String(outOfStock)} color="#EF4444" icon="close-circle-outline" />
        </View>

        {/* ── Category Filters ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {CATEGORY_FILTERS.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterTab, activeCategory === cat && styles.filterTabActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeCategory === cat && styles.filterTabTextActive,
                ]}
              >
                {cat}
              </Text>
              {activeCategory === cat && <View style={styles.filterTabDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Product List ── */}
        <Text style={styles.sectionTitle}>
          Products{' '}
          <Text style={styles.sectionCount}>({filtered.length})</Text>
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={44} color="#C4C4D4" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>Try a different search or category</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {filtered.map((p, i) => (
              <View key={p.id}>
                <TouchableOpacity style={styles.productRow} activeOpacity={0.7}>
                  {/* Status dot */}
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_CONFIG[p.status].dot },
                    ]}
                  />
                  <View style={styles.productInfo}>
                    <View style={styles.productTopRow}>
                      <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_CONFIG[p.status].bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: STATUS_CONFIG[p.status].color },
                          ]}
                        >
                          {STATUS_CONFIG[p.status].label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productBottomRow}>
                      <Text style={styles.productSku}>{p.sku}</Text>
                      <Text style={styles.productMeta}>
                        {p.location}  ·
                        <Text
                          style={[
                            styles.productQty,
                            { color: STATUS_CONFIG[p.status].color },
                          ]}
                        >
                          {' '}{p.qty} units
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
                </TouchableOpacity>
                {i < filtered.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Stock Alerts ── */}
        <Text style={styles.sectionTitle}>Stock Alerts</Text>
        <View style={styles.card}>
          {STOCK_ALERTS.map((alert, i) => (
            <View key={alert.id}>
              <View style={styles.alertRow}>
                <View
                  style={[
                    styles.alertIconWrap,
                    {
                      backgroundColor:
                        alert.urgency === 'critical' ? '#FFF1F1' : '#FFFBEB',
                    },
                  ]}
                >
                  <Ionicons
                    name={alert.urgency === 'critical' ? 'alert-circle' : 'warning'}
                    size={18}
                    color={alert.urgency === 'critical' ? '#EF4444' : '#F59E0B'}
                  />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertName}>{alert.name}</Text>
                  <Text style={styles.alertSku}>{alert.sku}</Text>
                  <Text style={styles.alertStock}>
                    {alert.qty === 0 ? 'Out of stock' : `${alert.qty} left`}
                    {' · '}Reorder at {alert.reorderPoint}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.reorderBtn,
                    {
                      backgroundColor:
                        alert.urgency === 'critical' ? '#EF4444' : '#F59E0B',
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reorderBtnText}>Reorder</Text>
                </TouchableOpacity>
              </View>
              {i < STOCK_ALERTS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, color, icon,
}: {
  label: string; value: string; color: string; icon: any
}) {
  return (
    <View style={[sumStyles.card, { borderTopColor: color }]}>
      <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 6 }} />
      <Text style={sumStyles.value}>{value}</Text>
      <Text style={sumStyles.label}>{label}</Text>
    </View>
  )
}

const sumStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderTopWidth: 3,
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C2E',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: '#6B6B8A',
    fontWeight: '500',
    textAlign: 'center',
  },
})

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1C2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
    backgroundColor: '#1C1C2E',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: '#8888AA',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,71,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.3)',
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C47FF',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 0,
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
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 14,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  // Filter tabs (replicates projects.tsx pattern)
  filterScroll: {
    maxHeight: 44,
    marginBottom: 20,
    marginHorizontal: -16,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,46,0.08)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B8A',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C2E',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionCount: {
    fontWeight: '500',
    color: '#9B9BB4',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 24,
    paddingVertical: 4,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  // Product row
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  productInfo: {
    flex: 1,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productSku: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B9BB4',
    letterSpacing: 0.3,
  },
  productMeta: {
    fontSize: 11,
    color: '#9B9BB4',
  },
  productQty: {
    fontWeight: '700',
  },
  // Alerts
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    marginBottom: 1,
  },
  alertSku: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B9BB4',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  alertStock: {
    fontSize: 12,
    color: '#6B6B8A',
  },
  reorderBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3D3D5C',
    marginTop: 14,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9B9BB4',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
})
