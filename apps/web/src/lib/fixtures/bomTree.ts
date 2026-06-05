/* ═══════════════════════════════════════════════════════════════
 * BOM Tree — multi-level Bill of Materials fixture.
 *
 * Each node is a part with a unit cost + stock qty. Children are
 * sub-components needed to build this part. Quantity on the link is
 * how many sub-units are consumed per unit of the parent.
 *
 * The roll-up "build cost" at any node = unitCost of every leaf
 * descendant × the cumulative quantity to reach that leaf. The
 * flowchart computes this lazily so changes to the tree update live.
 *
 * Keep this file dependency-free so it can also feed a future Postgres
 * migration: rows here map 1:1 to (parts, bom_links) tables.
 * ═══════════════════════════════════════════════════════════════ */

export interface BomPart {
  id: string;
  name: string;
  sku: string;
  /** Per-unit purchase cost. Leaves use this; internal nodes ignore it
   *  in favour of their children's roll-up. */
  unitCost: number;
  /** Current on-hand inventory. */
  stockQty: number;
  uom: string;
  /** Sub-components needed to build one of this part. Empty = leaf. */
  children: BomLink[];
}

export interface BomLink {
  /** How many of `node` are consumed per one of the parent. */
  quantity: number;
  node: BomPart;
}

export const DEMO_BOM_TREES: BomPart[] = [
  {
    id: "p-macbook",
    name: "MacBook Air M3",
    sku: "MBA-001",
    unitCost: 1099,
    stockQty: 8,
    uom: "pcs",
    children: [
      {
        quantity: 1,
        node: {
          id: "c-m3-chip",
          name: "M3 Chip Module",
          sku: "M3-CHIP",
          unitCost: 180,
          stockQty: 100,
          uom: "pcs",
          children: [
            {
              quantity: 1,
              node: {
                id: "c-soc-die",
                name: "SoC Die",
                sku: "SOC-001",
                unitCost: 90,
                stockQty: 50,
                uom: "pcs",
                children: [
                  {
                    quantity: 1,
                    node: {
                      id: "c-wafer",
                      name: "Silicon Wafer",
                      sku: "WAFER",
                      unitCost: 40,
                      stockQty: 30,
                      uom: "pcs",
                      children: [],
                    },
                  },
                  {
                    quantity: 1,
                    node: {
                      id: "c-litho",
                      name: "Lithography Pattern",
                      sku: "LITHO",
                      unitCost: 30,
                      stockQty: 100,
                      uom: "pcs",
                      children: [],
                    },
                  },
                ],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-gpu",
                name: "GPU Module",
                sku: "GPU-M3",
                unitCost: 50,
                stockQty: 60,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-mem-ctrl",
                name: "Memory Controller",
                sku: "MEM-CTRL",
                unitCost: 20,
                stockQty: 100,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-thermal-pad",
                name: "Thermal Pad",
                sku: "TPAD",
                unitCost: 5,
                stockQty: 500,
                uom: "pcs",
                children: [],
              },
            },
          ],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-lcd-15",
          name: 'LCD Panel 15"',
          sku: "LCD15",
          unitCost: 120,
          stockQty: 50,
          uom: "pcs",
          children: [
            {
              quantity: 1,
              node: {
                id: "c-glass-15",
                name: "Glass Sheet",
                sku: "GLASS",
                unitCost: 40,
                stockQty: 80,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-backlight",
                name: "Backlight Module",
                sku: "BACKLIGHT",
                unitCost: 35,
                stockQty: 100,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-driver-ic",
                name: "Driver IC",
                sku: "DRV-IC",
                unitCost: 25,
                stockQty: 200,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-bezel",
                name: "Bezel",
                sku: "BEZEL",
                unitCost: 10,
                stockQty: 300,
                uom: "pcs",
                children: [],
              },
            },
          ],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-logic-board",
          name: "Logic Board",
          sku: "LOGIC-BD",
          unitCost: 95,
          stockQty: 80,
          uom: "pcs",
          children: [
            {
              quantity: 1,
              node: {
                id: "c-pcb",
                name: "PCB Substrate",
                sku: "PCB",
                unitCost: 30,
                stockQty: 200,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 25,
              node: {
                id: "c-cap",
                name: "Capacitor",
                sku: "CAP-0805",
                unitCost: 0.6,
                stockQty: 5000,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 8,
              node: {
                id: "c-connector",
                name: "Connector",
                sku: "CONN",
                unitCost: 2.5,
                stockQty: 800,
                uom: "pcs",
                children: [],
              },
            },
          ],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-battery",
          name: "Battery Pack",
          sku: "BATT",
          unitCost: 65,
          stockQty: 200,
          uom: "pcs",
          children: [],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-chassis",
          name: "Aluminum Chassis",
          sku: "CHASSIS",
          unitCost: 45,
          stockQty: 150,
          uom: "pcs",
          children: [],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-keyboard",
          name: "Keyboard Assembly",
          sku: "KEYB",
          unitCost: 35,
          stockQty: 90,
          uom: "pcs",
          children: [],
        },
      },
    ],
  },
  {
    id: "p-iphone",
    name: "iPhone 16 Pro",
    sku: "IPH-001",
    unitCost: 999,
    stockQty: 45,
    uom: "pcs",
    children: [
      {
        quantity: 1,
        node: {
          id: "c-display-asm",
          name: "Display Assembly",
          sku: "DISP-ASM",
          unitCost: 95,
          stockQty: 120,
          uom: "pcs",
          children: [
            {
              quantity: 1,
              node: {
                id: "c-oled",
                name: "OLED Panel",
                sku: "OLED",
                unitCost: 55,
                stockQty: 200,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-touchic",
                name: "Touch IC",
                sku: "TIC",
                unitCost: 20,
                stockQty: 300,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-cover-glass",
                name: "Cover Glass",
                sku: "CGLAS",
                unitCost: 15,
                stockQty: 400,
                uom: "pcs",
                children: [],
              },
            },
          ],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-a18-chip",
          name: "A18 Pro Chip",
          sku: "A18P",
          unitCost: 140,
          stockQty: 80,
          uom: "pcs",
          children: [
            {
              quantity: 1,
              node: {
                id: "c-a18-die",
                name: "A18 Die",
                sku: "A18D",
                unitCost: 80,
                stockQty: 100,
                uom: "pcs",
                children: [],
              },
            },
            {
              quantity: 1,
              node: {
                id: "c-npu",
                name: "Neural Engine",
                sku: "NPU16",
                unitCost: 35,
                stockQty: 110,
                uom: "pcs",
                children: [],
              },
            },
          ],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-bat-iph",
          name: "Battery 3582 mAh",
          sku: "BAT-IPH",
          unitCost: 45,
          stockQty: 250,
          uom: "pcs",
          children: [],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-cam-48",
          name: "48MP Main Camera",
          sku: "CAM48",
          unitCost: 70,
          stockQty: 90,
          uom: "pcs",
          children: [],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-cam-12",
          name: "12MP Ultra-Wide Camera",
          sku: "CAM12U",
          unitCost: 35,
          stockQty: 130,
          uom: "pcs",
          children: [],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-tit-frame",
          name: "Titanium Frame",
          sku: "TFRAME",
          unitCost: 55,
          stockQty: 110,
          uom: "pcs",
          children: [],
        },
      },
      {
        quantity: 1,
        node: {
          id: "c-speaker",
          name: "Speaker Module",
          sku: "SPK",
          unitCost: 12,
          stockQty: 400,
          uom: "pcs",
          children: [],
        },
      },
    ],
  },
];

/* ─── Pure-data helpers (no React) ─────────────────────────────── */

/** Total raw-materials cost to build one unit of `node` — recursive
 *  sum of leaf unitCosts weighted by cumulative quantity. */
export function buildCost(node: BomPart, multiplier = 1): number {
  if (node.children.length === 0) {
    return node.unitCost * multiplier;
  }
  let total = 0;
  for (const link of node.children) {
    total += buildCost(link.node, multiplier * link.quantity);
  }
  return total;
}

/** How many `node` units can be built given the current sub-component
 *  inventory. Min over each child of floor(stock / qty-per-parent). */
export function buildableUnits(node: BomPart): number {
  if (node.children.length === 0) return node.stockQty;
  let min = Infinity;
  for (const link of node.children) {
    const childBuildable = buildableUnits(link.node);
    const yieldOfThisBranch = Math.floor(childBuildable / link.quantity);
    if (yieldOfThisBranch < min) min = yieldOfThisBranch;
  }
  return min === Infinity ? 0 : min;
}

/** Flattens to a Map<id, BomPart> so an external selector can look up
 *  a node by id without walking the whole tree each time. */
export function indexBomTree(root: BomPart): Map<string, BomPart> {
  const out = new Map<string, BomPart>();
  const stack: BomPart[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (!out.has(node.id)) {
      out.set(node.id, node);
      for (const link of node.children) stack.push(link.node);
    }
  }
  return out;
}
