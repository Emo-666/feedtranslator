export interface IndustryConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  context: string; // system-level prompt context for Claude
  glossary: Record<string, string>; // known term mappings (source -> target)
  exampleTerms: string[]; // shown in the UI as preview
}

export const industries: IndustryConfig[] = [
  {
    id: "luxury-watches-jewellery",
    name: "Luxury Watches & Jewellery",
    icon: "💎",
    description:
      "High-end timepieces and fine jewellery. Uses horological and gemological terminology.",
    context: `You are a professional translator specialising in high-end luxury watches and fine jewellery.
Use precise horological terminology (e.g. "movement" not "mechanism", "complication" not "feature", "case" not "body", "bezel" not "frame", "dial" not "face", "power reserve" not "battery life", "calibre" for movement reference).
Use precise gemological terminology (e.g. "ct" for carat weight, "brilliant-cut" not "shiny cut", "pavé" for pave setting, "cabochon" for domed polish, "baguette" for rectangular cut).
Metal types: always use "18K White Gold", "18K Rose Gold", "18K Yellow Gold", "925 Sterling Silver", "Stainless Steel", "Palladium", "Platinum".
Jewellery types: "Ring", "Earrings", "Necklace", "Bracelet", "Pendant", "Brooch", "Cufflinks".
Maintain an elevated, refined tone befitting a luxury maison. British English spelling (jewellery, colour, centre).`,
    glossary: {
      "Бижута": "Jewellery",
      "Часовници": "Watches",
      "Пръстен": "Ring",
      "Обеци": "Earrings",
      "Колие": "Necklace",
      "Гривна": "Bracelet",
      "Висулка": "Pendant",
      "Брошка": "Brooch",
      "Диаманти": "Diamonds",
      "Сапфири": "Sapphires",
      "Рубини": "Rubies",
      "Смарагди": "Emeralds",
      "18К бяло злато": "18K White Gold",
      "18К розово злато": "18K Rose Gold",
      "18К жълто злато": "18K Yellow Gold",
      "Неръждаема стомана": "Stainless Steel",
      "карата": "ct",
      "Автоматичен": "Automatic",
      "Ръчно навиване": "Hand-Winding",
      "Водоустойчивост": "Water Resistance",
      "Механизъм": "Movement",
      "Корпус": "Case",
      "Безел": "Bezel",
      "Циферблат": "Dial",
      "Каишка": "Strap",
      "Стъкло": "Crystal",
    },
    exampleTerms: [
      "Безел → Bezel",
      "карата → ct",
      "Механизъм → Movement",
      "18К розово злато → 18K Rose Gold",
    ],
  },
  {
    id: "fashion-apparel",
    name: "Fashion & Apparel",
    icon: "👗",
    description:
      "Clothing, footwear, and fashion accessories. Uses textile and fashion industry terminology.",
    context: `You are a professional translator specialising in fashion and apparel.
Use standard fashion industry terminology (e.g. "silhouette" not "shape", "drape" not "hang", "fabrication" not "material type", "colourway" not "colour version").
Fabric types: use proper textile names (e.g. "charmeuse", "organza", "twill", "jersey knit", "French terry").
Sizing: maintain original sizing notation.
Maintain a contemporary, fashion-forward tone. British English spelling.`,
    glossary: {
      "Дрехи": "Clothing",
      "Обувки": "Footwear",
      "Аксесоари": "Accessories",
      "Рокля": "Dress",
      "Панталон": "Trousers",
      "Риза": "Shirt",
      "Яке": "Jacket",
      "Палто": "Coat",
      "Памук": "Cotton",
      "Коприна": "Silk",
      "Вълна": "Wool",
      "Полиестер": "Polyester",
    },
    exampleTerms: [
      "Рокля → Dress",
      "Коприна → Silk",
      "Яке → Jacket",
      "Палто → Coat",
    ],
  },
  {
    id: "electronics-tech",
    name: "Electronics & Technology",
    icon: "📱",
    description:
      "Consumer electronics, gadgets, and tech accessories. Uses technical specification terminology.",
    context: `You are a professional translator specialising in consumer electronics and technology.
Use precise technical terminology (e.g. "display" not "screen" for specs, "processor" not "chip", "storage capacity" not "memory size", "connectivity" not "connections").
Specifications: maintain exact values, units, and model numbers untranslated.
Use clear, concise product language typical of tech retail. British English spelling.`,
    glossary: {
      "Електроника": "Electronics",
      "Смартфон": "Smartphone",
      "Лаптоп": "Laptop",
      "Таблет": "Tablet",
      "Слушалки": "Headphones",
      "Батерия": "Battery",
      "Дисплей": "Display",
      "Процесор": "Processor",
      "Памет": "Memory",
    },
    exampleTerms: [
      "Дисплей → Display",
      "Процесор → Processor",
      "Батерия → Battery",
      "Слушалки → Headphones",
    ],
  },
  {
    id: "home-furniture",
    name: "Home & Furniture",
    icon: "🏠",
    description:
      "Home decor, furniture, and interior design products. Uses interior design terminology.",
    context: `You are a professional translator specialising in home furnishings and interior design.
Use interior design terminology (e.g. "upholstery" not "covering", "veneer" not "thin wood layer", "patina" not "aged look", "bespoke" for custom-made).
Materials: use proper names (e.g. "solid oak", "Italian marble", "brushed nickel", "hand-blown glass").
Maintain a sophisticated, lifestyle-oriented tone. British English spelling.`,
    glossary: {
      "Мебели": "Furniture",
      "Маса": "Table",
      "Стол": "Chair",
      "Диван": "Sofa",
      "Легло": "Bed",
      "Шкаф": "Cabinet",
      "Лампа": "Lamp",
      "Килим": "Rug",
      "Дърво": "Wood",
    },
    exampleTerms: [
      "Мебели → Furniture",
      "Диван → Sofa",
      "Килим → Rug",
      "Дърво → Wood",
    ],
  },
  {
    id: "beauty-cosmetics",
    name: "Beauty & Cosmetics",
    icon: "💄",
    description:
      "Skincare, makeup, fragrances, and beauty products. Uses cosmetics industry terminology.",
    context: `You are a professional translator specialising in beauty, skincare, and cosmetics.
Use beauty industry terminology (e.g. "formulation" not "recipe", "pigmentation" not "colour intensity", "luminosity" not "glow", "complexion" not "skin colour").
Ingredients: maintain INCI names unchanged, translate common names alongside.
Maintain an aspirational, sensorial tone. British English spelling.`,
    glossary: {
      "Козметика": "Cosmetics",
      "Грим": "Makeup",
      "Парфюм": "Fragrance",
      "Крем": "Cream",
      "Серум": "Serum",
      "Маска": "Mask",
      "Червило": "Lipstick",
      "Сенки": "Eyeshadow",
    },
    exampleTerms: [
      "Парфюм → Fragrance",
      "Серум → Serum",
      "Червило → Lipstick",
      "Козметика → Cosmetics",
    ],
  },
  {
    id: "custom",
    name: "Custom Industry",
    icon: "⚙️",
    description:
      "Define your own terminology context. Provide a custom prompt describing your industry.",
    context: "",
    glossary: {},
    exampleTerms: [],
  },
];

export function getIndustry(id: string): IndustryConfig | undefined {
  return industries.find((i) => i.id === id);
}
