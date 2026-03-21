import type { ERPProduct, ERPOrder, ERPSupplier, ERPBOM, ERPWorkOrder } from '@/lib/api/client'

export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL

// ── Mock Products ─────────────────────────────────────────────────
export const MOCK_PRODUCTS: ERPProduct[] = [
  { id: 'p1', name: 'iPhone 16 Pro', sku: 'IPH-001', price: 999, costPrice: 720, stockQty: 45, uom: 'pcs', categoryName: 'Electronics', status: 'in_stock' },
  { id: 'p2', name: 'MacBook Air M3', sku: 'MBA-001', price: 1099, costPrice: 820, stockQty: 8, uom: 'pcs', categoryName: 'Computers', status: 'low_stock' },
  { id: 'p3', name: 'AirPods Pro', sku: 'APP-001', price: 249, costPrice: 180, stockQty: 0, uom: 'pcs', categoryName: 'Audio', status: 'out_of_stock' },
  { id: 'p4', name: 'iPad Air', sku: 'IPA-001', price: 599, costPrice: 440, stockQty: 23, uom: 'pcs', categoryName: 'Tablets', status: 'in_stock' },
  { id: 'p5', name: 'Apple Watch S10', sku: 'AW-001', price: 399, costPrice: 290, stockQty: 6, uom: 'pcs', categoryName: 'Wearables', status: 'low_stock' },
]

// ── Mock Orders ───────────────────────────────────────────────────
export const MOCK_ORDERS: ERPOrder[] = [
  { id: 'o1', orderNumber: 'ORD-001', customerName: 'TechCorp Inc.', status: 'confirmed', total: 4995, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'o2', orderNumber: 'ORD-002', customerName: 'Acme Ltd.', status: 'shipped', total: 1099, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'o3', orderNumber: 'ORD-003', customerName: 'StartupXYZ', status: 'draft', total: 747, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'o4', orderNumber: 'ORD-004', customerName: 'Global Retail', status: 'delivered', total: 2198, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 'o5', orderNumber: 'ORD-005', customerName: 'MegaCorp', status: 'cancelled', total: 599, createdAt: new Date(Date.now() - 345600000).toISOString() },
]

// ── Mock Suppliers ────────────────────────────────────────────────
export const MOCK_SUPPLIERS: ERPSupplier[] = [
  { id: 's1', name: 'Apple Distributors Inc.', contactName: 'John Smith', email: 'john@apple-dist.com', phone: '+1 415 555 0101', status: 'active' },
  { id: 's2', name: 'TechWholesale Ltd.', contactName: 'Jane Doe', email: 'jane@techw.com', phone: '+1 650 555 0202', status: 'active' },
  { id: 's3', name: 'Global Parts Co.', contactName: 'Bob Lee', email: 'bob@globalparts.com', phone: '+1 212 555 0303', status: 'inactive' },
]

// ── Mock BOMs ─────────────────────────────────────────────────────
export const MOCK_BOMS: ERPBOM[] = [
  { id: 'b1', productId: 'p1', productName: 'iPhone 16 Pro', version: '1.0', components: [{ componentId: 'c1', componentName: 'Display Assembly', quantity: 1, uom: 'pcs' }, { componentId: 'c2', componentName: 'Battery Pack', quantity: 1, uom: 'pcs' }, { componentId: 'c3', componentName: 'Chip A18 Pro', quantity: 1, uom: 'pcs' }] },
  { id: 'b2', productId: 'p2', productName: 'MacBook Air M3', version: '1.0', components: [{ componentId: 'c4', componentName: 'M3 Chip Module', quantity: 1, uom: 'pcs' }, { componentId: 'c5', componentName: 'LCD Panel 15"', quantity: 1, uom: 'pcs' }] },
]

// ── Mock Work Orders ──────────────────────────────────────────────
export const MOCK_WORK_ORDERS: ERPWorkOrder[] = [
  { id: 'w1', productName: 'iPhone 16 Pro', qtyToProduce: 100, status: 'in_progress', scheduledDate: new Date(Date.now() + 86400000).toISOString(), dueDate: new Date(Date.now() + 172800000).toISOString() },
  { id: 'w2', productName: 'MacBook Air M3', qtyToProduce: 50, status: 'planned', scheduledDate: new Date(Date.now() + 259200000).toISOString(), dueDate: new Date(Date.now() + 345600000).toISOString() },
  { id: 'w3', productName: 'AirPods Pro', qtyToProduce: 200, status: 'done', scheduledDate: new Date(Date.now() - 172800000).toISOString(), dueDate: new Date(Date.now() - 86400000).toISOString() },
]

// ── Status map ────────────────────────────────────────────────────
export type StatusKey = 'in_stock' | 'low_stock' | 'out_of_stock' | 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'planned' | 'in_progress' | 'done' | 'active' | 'inactive'

export const STATUS_MAP: Record<StatusKey, { label: string; bg: string; color: string }> = {
  in_stock:      { label: 'In Stock',    bg: '#F0FDF4', color: '#166534' },
  low_stock:     { label: 'Low Stock',   bg: '#FFFBEB', color: '#92400E' },
  out_of_stock:  { label: 'Out of Stock',bg: '#FEF2F2', color: '#991B1B' },
  draft:         { label: 'Draft',       bg: '#F0F0F8', color: '#6B6B8A' },
  confirmed:     { label: 'Confirmed',   bg: '#EFF6FF', color: '#1E40AF' },
  shipped:       { label: 'Shipped',     bg: '#FFFBEB', color: '#92400E' },
  delivered:     { label: 'Delivered',   bg: '#F0FDF4', color: '#166534' },
  cancelled:     { label: 'Cancelled',   bg: '#FEF2F2', color: '#991B1B' },
  planned:       { label: 'Planned',     bg: '#F0F0F8', color: '#6B6B8A' },
  in_progress:   { label: 'In Progress', bg: '#EFF6FF', color: '#1E40AF' },
  done:          { label: 'Done',        bg: '#F0FDF4', color: '#166534' },
  active:        { label: 'Active',      bg: '#F0FDF4', color: '#166534' },
  inactive:      { label: 'Inactive',    bg: '#F0F0F8', color: '#6B6B8A' },
}
