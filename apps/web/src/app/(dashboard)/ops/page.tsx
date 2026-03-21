'use client'

import { useState, useEffect } from 'react'
import {
  Package, Plus, Search, Edit2, Check,
  AlertTriangle, X, TrendingUp, ShoppingCart, Truck, Factory,
} from 'lucide-react'
import { erpApi, type ERPProduct, type ERPOrder, type ERPSupplier, type ERPBOM, type ERPWorkOrder } from '@/lib/api/client'
import { formatRelativeTime } from '@/lib/utils'

// ─── Mock data ────────────────────────────────────────────────────
const MOCK_PRODUCTS: ERPProduct[] = [
  { id: 'p1', name: 'iPhone 16 Pro', sku: 'IPH-001', price: 999, costPrice: 720, stockQty: 45, uom: 'pcs', categoryName: 'Electronics', status: 'in_stock' },
  { id: 'p2', name: 'MacBook Air M3', sku: 'MBA-001', price: 1099, costPrice: 820, stockQty: 8, uom: 'pcs', categoryName: 'Computers', status: 'low_stock' },
  { id: 'p3', name: 'AirPods Pro', sku: 'APP-001', price: 249, costPrice: 180, stockQty: 0, uom: 'pcs', categoryName: 'Audio', status: 'out_of_stock' },
  { id: 'p4', name: 'iPad Air', sku: 'IPA-001', price: 599, costPrice: 440, stockQty: 23, uom: 'pcs', categoryName: 'Tablets', status: 'in_stock' },
  { id: 'p5', name: 'Apple Watch S10', sku: 'AW-001', price: 399, costPrice: 290, stockQty: 6, uom: 'pcs', categoryName: 'Wearables', status: 'low_stock' },
]

const MOCK_ORDERS: ERPOrder[] = [
  { id: 'o1', orderNumber: 'ORD-001', customerName: 'TechCorp Inc.', status: 'confirmed', total: 4995, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'o2', orderNumber: 'ORD-002', customerName: 'Acme Ltd.', status: 'shipped', total: 1099, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'o3', orderNumber: 'ORD-003', customerName: 'StartupXYZ', status: 'draft', total: 747, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'o4', orderNumber: 'ORD-004', customerName: 'Global Retail', status: 'delivered', total: 2198, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 'o5', orderNumber: 'ORD-005', customerName: 'MegaCorp', status: 'cancelled', total: 599, createdAt: new Date(Date.now() - 345600000).toISOString() },
]

const MOCK_SUPPLIERS: ERPSupplier[] = [
  { id: 's1', name: 'Apple Distributors Inc.', contactName: 'John Smith', email: 'john@apple-dist.com', phone: '+1 415 555 0101', status: 'active' },
  { id: 's2', name: 'TechWholesale Ltd.', contactName: 'Jane Doe', email: 'jane@techw.com', phone: '+1 650 555 0202', status: 'active' },
  { id: 's3', name: 'Global Parts Co.', contactName: 'Bob Lee', email: 'bob@globalparts.com', phone: '+1 212 555 0303', status: 'inactive' },
]

const MOCK_BOMS: ERPBOM[] = [
  { id: 'b1', productId: 'p1', productName: 'iPhone 16 Pro', version: '1.0', components: [{ componentId: 'c1', componentName: 'Display Assembly', quantity: 1, uom: 'pcs' }, { componentId: 'c2', componentName: 'Battery Pack', quantity: 1, uom: 'pcs' }, { componentId: 'c3', componentName: 'Chip A18 Pro', quantity: 1, uom: 'pcs' }] },
  { id: 'b2', productId: 'p2', productName: 'MacBook Air M3', version: '1.0', components: [{ componentId: 'c4', componentName: 'M3 Chip Module', quantity: 1, uom: 'pcs' }, { componentId: 'c5', componentName: 'LCD Panel 15"', quantity: 1, uom: 'pcs' }] },
]

const MOCK_WORK_ORDERS: ERPWorkOrder[] = [
  { id: 'w1', productName: 'iPhone 16 Pro', qtyToProduce: 100, status: 'in_progress', scheduledDate: new Date(Date.now() + 86400000).toISOString(), dueDate: new Date(Date.now() + 172800000).toISOString() },
  { id: 'w2', productName: 'MacBook Air M3', qtyToProduce: 50, status: 'planned', scheduledDate: new Date(Date.now() + 259200000).toISOString(), dueDate: new Date(Date.now() + 345600000).toISOString() },
  { id: 'w3', productName: 'AirPods Pro', qtyToProduce: 200, status: 'done', scheduledDate: new Date(Date.now() - 172800000).toISOString(), dueDate: new Date(Date.now() - 86400000).toISOString() },
]

// ─── Design helpers ───────────────────────────────────────────────
type StatusKey = 'in_stock' | 'low_stock' | 'out_of_stock' | 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'planned' | 'in_progress' | 'done' | 'active' | 'inactive'

const STATUS_MAP: Record<StatusKey, { label: string; bg: string; color: string }> = {
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

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const s = STATUS_MAP[status as StatusKey] ?? { label: status, bg: '#F0F0F8', color: '#6B6B8A' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function TabBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
        background: active ? '#6C47FF' : 'transparent',
        color: active ? '#fff' : '#6B6B8A',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}

interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }
function Modal({ open, onClose, title, children, width = 480 }: Readonly<ModalProps>) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: 12, width, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8,
  background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box',
}

// ─── Overview tab ─────────────────────────────────────────────────
function OverviewTab({ products, orders }: Readonly<{ products: ERPProduct[]; orders: ERPOrder[] }>) {
  const inStock = products.filter((p) => p.status === 'in_stock').length
  const lowStock = products.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock').length
  const activeOrders = orders.filter((o) => o.status === 'confirmed' || o.status === 'shipped').length
  const revenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0)

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: <Package size={18} style={{ color: '#6C47FF' }} />, label: 'Total Products', value: products.length.toString(), sub: `${inStock} in stock`, bg: 'rgba(108,71,255,0.08)' },
          { icon: <ShoppingCart size={18} style={{ color: '#3B82F6' }} />, label: 'Active Orders', value: activeOrders.toString(), sub: `${orders.filter(o=>o.status==='draft').length} drafts`, bg: 'rgba(59,130,246,0.08)' },
          { icon: <AlertTriangle size={18} style={{ color: '#F59E0B' }} />, label: 'Low Stock Alerts', value: lowStock.toString(), sub: 'items need reorder', bg: 'rgba(245,158,11,0.08)' },
          { icon: <TrendingUp size={18} style={{ color: '#22C55E' }} />, label: 'Revenue (Delivered)', value: `$${revenue.toLocaleString()}`, sub: 'all time', bg: 'rgba(34,197,94,0.08)' },
        ].map(({ icon, label, value, sub, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 10, color: '#A0A0B8', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent orders + Low stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 280px)', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Recent Orders</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7F7FB' }}>
                {['Order #', 'Customer', 'Total', 'Status', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6C47FF' }}>{o.orderNumber}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#1A1A2E' }}>{o.customerName}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#1A1A2E', fontWeight: 500 }}>${o.total.toLocaleString()}</td>
                  <td style={{ padding: '10px 16px' }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 11, color: '#A0A0B8' }}>{formatRelativeTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Low Stock Alerts</div>
          <div style={{ padding: '8px 0' }}>
            {products.filter((p) => p.status !== 'in_stock').map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
                <AlertTriangle size={13} style={{ color: p.status === 'out_of_stock' ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#1A1A2E' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#A0A0B8' }}>{p.sku} · {p.stockQty} left</div>
                </div>
                <StatusBadge status={p.status ?? 'in_stock'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Inventory tab ────────────────────────────────────────────────
function stockQtyColor(qty: number): string {
  if (qty === 0) return '#EF4444'
  if (qty <= 10) return '#F59E0B'
  return '#1A1A2E'
}

function InventoryTab({ products, setProducts }: Readonly<{ products: ERPProduct[]; setProducts: (p: ERPProduct[]) => void }>) {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState<ERPProduct | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', price: '', costPrice: '', stockQty: '', uom: 'pcs', categoryName: '' })
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('received')

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  function addProduct() {
    const product: ERPProduct = {
      id: `p${Date.now()}`,
      name: form.name, sku: form.sku,
      price: Number.parseFloat(form.price) || 0,
      costPrice: Number.parseFloat(form.costPrice) || 0,
      stockQty: Number.parseInt(form.stockQty) || 0,
      uom: form.uom, categoryName: form.categoryName,
      status: 'in_stock',
    }
    setProducts([...products, product])
    erpApi.createProduct(product).catch(() => {})
    setAddOpen(false)
    setForm({ name: '', sku: '', price: '', costPrice: '', stockQty: '', uom: 'pcs', categoryName: '' })
  }

  function adjustStock() {
    if (!adjustOpen) return
    const delta = Number.parseInt(adjustQty) || 0
    setProducts(products.map((p) => {
      if (p.id !== adjustOpen.id) return p
      const newQty = Math.max(0, p.stockQty + delta)
      let status: ERPProduct['status'] = 'in_stock'
      if (newQty === 0) status = 'out_of_stock'
      else if (newQty <= 10) status = 'low_stock'
      return { ...p, stockQty: newQty, status }
    }))
    erpApi.adjustStock(adjustOpen.id, delta, adjustReason).catch(() => {})
    setAdjustOpen(null)
    setAdjustQty('')
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F0F0F8', border: '1px solid #E8E8F0', borderRadius: 8, padding: '6px 10px', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ color: '#A0A0B8' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#1A1A2E' }} />
        </div>
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
          <Plus size={13} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              {['SKU', 'Product', 'Category', 'Stock', 'UOM', 'Cost', 'Price', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#6B6B8A' }}>{p.sku}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{p.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{p.categoryName ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: stockQtyColor(p.stockQty), fontWeight: 600 }}>{p.stockQty}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{p.uom}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>${p.costPrice.toFixed(2)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>${p.price.toFixed(2)}</td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={p.status ?? 'in_stock'} /></td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => setAdjustOpen(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#6B6B8A' }}>
                    <Edit2 size={11} /> Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#A0A0B8', fontSize: 13 }}>No products found</div>
        )}
      </div>

      {/* Add Product modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Product">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Product Name">
            <input id="prod-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iPhone 16 Pro" style={inputStyle} />
          </FormField>
          <FormField label="SKU">
            <input id="prod-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="IPH-001" style={inputStyle} />
          </FormField>
          <FormField label="Cost Price ($)">
            <input id="prod-cost" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="720.00" style={inputStyle} />
          </FormField>
          <FormField label="Sale Price ($)">
            <input id="prod-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="999.00" style={inputStyle} />
          </FormField>
          <FormField label="Initial Stock">
            <input id="prod-stock" type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} placeholder="100" style={inputStyle} />
          </FormField>
          <FormField label="Unit of Measure">
            <select id="prod-uom" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} style={{ ...inputStyle }}>
              {['pcs', 'kg', 'litre', 'box', 'dozen', 'metre'].map((u) => <option key={u}>{u}</option>)}
            </select>
          </FormField>
          <div style={{ gridColumn: '1/-1' }}>
            <FormField label="Category">
              <input id="prod-cat" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} placeholder="Electronics" style={inputStyle} />
            </FormField>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={() => setAddOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
          <button onClick={addProduct} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Create Product</button>
        </div>
      </Modal>

      {/* Adjust stock modal */}
      <Modal open={!!adjustOpen} onClose={() => setAdjustOpen(null)} title={`Adjust Stock — ${adjustOpen?.name}`} width={380}>
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#F7F7FB', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#6B6B8A' }}>Current stock</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E' }}>{adjustOpen?.stockQty ?? 0} {adjustOpen?.uom}</div>
        </div>
        <FormField label="Quantity Change (+/-)">
          <input id="adj-qty" type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="+50 or -10" style={inputStyle} />
        </FormField>
        <FormField label="Reason">
          <select id="adj-reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} style={{ ...inputStyle }}>
            {['received', 'sold', 'damaged', 'return', 'audit', 'other'].map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </FormField>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setAdjustOpen(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
          <button onClick={adjustStock} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Apply Adjustment</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Orders tab ───────────────────────────────────────────────────
function OrdersTab({ orders, setOrders }: Readonly<{ orders: ERPOrder[]; setOrders: (o: ERPOrder[]) => void }>) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ customerName: '', customerEmail: '' })

  const statuses = ['all', 'draft', 'confirmed', 'shipped', 'delivered', 'cancelled']
  const filtered = orders.filter((o) => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || o.orderNumber.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  function updateOrderStatus(id: string, status: ERPOrder['status']) {
    setOrders(orders.map((o) => o.id === id ? { ...o, status } : o))
    if (status === 'confirmed') erpApi.confirmOrder(id).catch(() => {})
    else if (status === 'shipped') erpApi.shipOrder(id).catch(() => {})
    else if (status === 'delivered') erpApi.deliverOrder(id).catch(() => {})
    else if (status === 'cancelled') erpApi.cancelOrder(id).catch(() => {})
  }

  function createOrder() {
    const order: ERPOrder = {
      id: `o${Date.now()}`, orderNumber: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      customerName: form.customerName, customerEmail: form.customerEmail,
      status: 'draft', total: 0, createdAt: new Date().toISOString(),
    }
    setOrders([order, ...orders])
    erpApi.createOrder(order).catch(() => {})
    setNewOpen(false)
    setForm({ customerName: '', customerEmail: '' })
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: filter === s ? '#6C47FF' : '#F0F0F8', color: filter === s ? '#fff' : '#6B6B8A', textTransform: 'capitalize' }}>
              {s === 'all' ? 'All' : (STATUS_MAP[s as StatusKey]?.label ?? s)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F0F0F8', border: '1px solid #E8E8F0', borderRadius: 8, padding: '5px 10px' }}>
            <Search size={12} style={{ color: '#A0A0B8' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#1A1A2E', width: 160 }} />
          </div>
          <button onClick={() => setNewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
            <Plus size={13} /> New Order
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              {['Order #', 'Customer', 'Date', 'Total', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6C47FF' }}>{o.orderNumber}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{o.customerName}</div>
                  {o.customerEmail && <div style={{ fontSize: 10, color: '#A0A0B8' }}>{o.customerEmail}</div>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#A0A0B8' }}>{formatRelativeTime(o.createdAt)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>${o.total.toLocaleString()}</td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={o.status} /></td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {o.status === 'draft' && (
                      <button onClick={() => updateOrderStatus(o.id, 'confirmed')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #3B82F6', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#3B82F6' }}>
                        <Check size={10} /> Confirm
                      </button>
                    )}
                    {o.status === 'confirmed' && (
                      <button onClick={() => updateOrderStatus(o.id, 'shipped')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #F59E0B', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#F59E0B' }}>
                        <Truck size={10} /> Ship
                      </button>
                    )}
                    {o.status === 'shipped' && (
                      <button onClick={() => updateOrderStatus(o.id, 'delivered')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #22C55E', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#22C55E' }}>
                        <Check size={10} /> Deliver
                      </button>
                    )}
                    {(o.status === 'draft' || o.status === 'confirmed') && (
                      <button onClick={() => updateOrderStatus(o.id, 'cancelled')} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#6B6B8A' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#A0A0B8', fontSize: 13 }}>No orders found</div>
        )}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Order" width={400}>
        <FormField label="Customer Name">
          <input id="order-cust" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Acme Ltd." style={inputStyle} />
        </FormField>
        <FormField label="Customer Email (optional)">
          <input id="order-email" type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="orders@acme.com" style={inputStyle} />
        </FormField>
        <p style={{ fontSize: 11, color: '#A0A0B8', marginBottom: 14 }}>Line items can be added after creating the order.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setNewOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
          <button onClick={createOrder} disabled={!form.customerName} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: form.customerName ? '#6C47FF' : '#E8E8F0', color: form.customerName ? '#fff' : '#A0A0B8', cursor: form.customerName ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>Create Order</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Suppliers tab ────────────────────────────────────────────────
function SuppliersTab({ suppliers, setSuppliers }: Readonly<{ suppliers: ERPSupplier[]; setSuppliers: (s: ERPSupplier[]) => void }>) {
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '' })

  function addSupplier() {
    const s: ERPSupplier = { id: `s${Date.now()}`, ...form, status: 'active' }
    setSuppliers([...suppliers, s])
    erpApi.createSupplier(s).catch(() => {})
    setAddOpen(false)
    setForm({ name: '', contactName: '', email: '', phone: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
          <Plus size={13} /> Add Supplier
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              {['Supplier', 'Contact', 'Email', 'Phone', 'Status'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{s.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{s.contactName ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{s.email ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{s.phone ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={s.status ?? 'active'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier" width={420}>
        <FormField label="Company Name"><input id="sup-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Supplies Ltd." style={inputStyle} /></FormField>
        <FormField label="Contact Name"><input id="sup-contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Jane Smith" style={inputStyle} /></FormField>
        <FormField label="Email"><input id="sup-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.com" style={inputStyle} /></FormField>
        <FormField label="Phone"><input id="sup-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 415 555 0100" style={inputStyle} /></FormField>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={() => setAddOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
          <button onClick={addSupplier} disabled={!form.name} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: form.name ? '#6C47FF' : '#E8E8F0', color: form.name ? '#fff' : '#A0A0B8', cursor: form.name ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>Add Supplier</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Manufacturing tab ────────────────────────────────────────────
function ManufacturingTab({ boms, workOrders, setWorkOrders }: Readonly<{ boms: ERPBOM[]; workOrders: ERPWorkOrder[]; setWorkOrders: (w: ERPWorkOrder[]) => void }>) {
  const [subTab, setSubTab] = useState<'boms' | 'work-orders'>('boms')
  const [bomDetail, setBomDetail] = useState<ERPBOM | null>(null)
  const [newWOOpen, setNewWOOpen] = useState(false)
  const [woForm, setWoForm] = useState({ productName: '', qtyToProduce: '' })

  function createWorkOrder() {
    const wo: ERPWorkOrder = {
      id: `w${Date.now()}`, productName: woForm.productName,
      qtyToProduce: Number.parseInt(woForm.qtyToProduce) || 0,
      status: 'planned',
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    }
    setWorkOrders([...workOrders, wo])
    erpApi.createWorkOrder(wo).catch(() => {})
    setNewWOOpen(false)
    setWoForm({ productName: '', qtyToProduce: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <TabBtn label="Bills of Materials" active={subTab === 'boms'} onClick={() => setSubTab('boms')} />
        <TabBtn label="Work Orders" active={subTab === 'work-orders'} onClick={() => setSubTab('work-orders')} />
      </div>

      {subTab === 'boms' && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7F7FB' }}>
                {['Product', 'Version', 'Components', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boms.map((b) => (
                <tr key={b.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{b.productName}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>v{b.version}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{b.components?.length ?? 0} components</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => setBomDetail(b)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#6B6B8A' }}>
                      View BOM
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'work-orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button onClick={() => setNewWOOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              <Plus size={13} /> New Work Order
            </button>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7F7FB' }}>
                  {['Product', 'Qty to Produce', 'Status', 'Scheduled', 'Due Date'].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workOrders.map((w) => (
                  <tr key={w.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{w.productName}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{w.qtyToProduce}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={w.status} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#A0A0B8' }}>{w.scheduledDate ? new Date(w.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#A0A0B8' }}>{w.dueDate ? new Date(w.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal open={newWOOpen} onClose={() => setNewWOOpen(false)} title="New Work Order" width={380}>
            <FormField label="Product"><input id="wo-prod" value={woForm.productName} onChange={(e) => setWoForm({ ...woForm, productName: e.target.value })} placeholder="iPhone 16 Pro" style={inputStyle} /></FormField>
            <FormField label="Quantity to Produce"><input id="wo-qty" type="number" value={woForm.qtyToProduce} onChange={(e) => setWoForm({ ...woForm, qtyToProduce: e.target.value })} placeholder="100" style={inputStyle} /></FormField>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setNewWOOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
              <button onClick={createWorkOrder} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Create</button>
            </div>
          </Modal>
        </div>
      )}

      {/* BOM detail modal */}
      <Modal open={!!bomDetail} onClose={() => setBomDetail(null)} title={`BOM — ${bomDetail?.productName}`} width={440}>
        <div style={{ marginBottom: 12, fontSize: 11, color: '#6B6B8A' }}>Version {bomDetail?.version}</div>
        <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7F7FB' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase' }}>Component</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase' }}>Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase' }}>UOM</th>
              </tr>
            </thead>
            <tbody>
              {bomDetail?.components?.map((c) => (
                <tr key={c.componentId} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#1A1A2E' }}>{c.componentName}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#1A1A2E', textAlign: 'right' }}>{c.quantity}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#6B6B8A' }}>{c.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function OpsPage() {
  const [tab, setTab] = useState<'overview' | 'inventory' | 'orders' | 'suppliers' | 'manufacturing'>('overview')
  const [products, setProducts] = useState<ERPProduct[]>(MOCK_PRODUCTS)
  const [orders, setOrders] = useState<ERPOrder[]>(MOCK_ORDERS)
  const [suppliers, setSuppliers] = useState<ERPSupplier[]>(MOCK_SUPPLIERS)
  const [boms] = useState<ERPBOM[]>(MOCK_BOMS)
  const [workOrders, setWorkOrders] = useState<ERPWorkOrder[]>(MOCK_WORK_ORDERS)

  // Load real data if API available
  useEffect(() => {
    erpApi.listProducts().then((r) => setProducts(r.data)).catch(() => {})
    erpApi.listOrders().then((r) => setOrders(r.data)).catch(() => {})
    erpApi.listSuppliers().then((r) => setSuppliers(r.data)).catch(() => {})
  }, [])

  const tabs: Array<{ id: typeof tab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={13} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={13} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart size={13} /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Truck size={13} /> },
    { id: 'manufacturing', label: 'Manufacturing', icon: <Factory size={13} /> },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Operations</h1>
            <p style={{ fontSize: 12, color: '#A0A0B8', margin: '2px 0 0' }}>ERP · Inventory · Manufacturing · Orders</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: `${products.filter(p => p.status !== 'in_stock').length} low stock`, color: '#F59E0B' },
              { label: `${orders.filter(o => o.status === 'confirmed').length} pending orders`, color: '#3B82F6' },
            ].map(({ label, color }) => (
              <span key={label} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${color}18`, color }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: 'transparent', color: tab === id ? '#6C47FF' : '#6B6B8A',
                borderBottom: tab === id ? '2px solid #6C47FF' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {tab === 'overview' && <OverviewTab products={products} orders={orders} />}
        {tab === 'inventory' && <InventoryTab products={products} setProducts={setProducts} />}
        {tab === 'orders' && <OrdersTab orders={orders} setOrders={setOrders} />}
        {tab === 'suppliers' && <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} />}
        {tab === 'manufacturing' && <ManufacturingTab boms={boms} workOrders={workOrders} setWorkOrders={setWorkOrders} />}
      </div>
    </div>
  )
}
