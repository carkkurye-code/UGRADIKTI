// High-Quality Studio Photography for Category Cards
// Crafted to match Apple / Nothing style minimalist studio aesthetics

export const CATEGORY_STUDIO_IMAGES: Record<string, string> = {
  // Senin Dükkanın: Handmade ceramic vase & pottery on studio wood
  'Senin Dükkanın': 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=800&auto=format&fit=crop',

  // Kafe: Premium ceramic coffee cup with latte art on dark table
  'Kahve': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=800&auto=format&fit=crop',
  'Kafe': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=800&auto=format&fit=crop',

  // Restoran: Gourmet culinary dining table setup
  'Restoran': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop',

  // Medikal: Health & medical equipment studio photo
  'Medikal': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?q=80&w=800&auto=format&fit=crop',
  'Sağlık & Medikal': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?q=80&w=800&auto=format&fit=crop',

  // Giyim: Folded luxury fashion garments & boutique composition in studio
  'Giyim': 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?q=80&w=800&auto=format&fit=crop',

  // Kozmetik: Premium glass serum bottle, dropper & skincare composition
  'Kozmetik': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop',

  // Parfüm & Parfümeri: Luxury glass perfume bottle with black cap
  'Parfüm & Parfümeri': 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=800&auto=format&fit=crop',

  // Petshop: Fluffy puppy in cozy studio setup
  'Petshop': 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=800&auto=format&fit=crop',

  // Takı & Aksesuar: Luxury gold necklace with diamond pendant
  'Takı & Aksesuar': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',

  // Hediyelik: Matte black gift box with satin bow ribbon
  'Hediyelik': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop',

  // Çiçekçi: Pure white orchid against dark background
  'Çiçekçi': 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?q=80&w=800&auto=format&fit=crop',

  // Çanta & Valiz: Premium leather handbag studio photo
  'Çanta & Valiz': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop',

  // Optik: Gold aviator sunglasses on light marble surface
  'Optik': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop',

  // Bebek: Cute teddy bear with wooden stacker toy
  'Bebek': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800&auto=format&fit=crop',

  // Teknoloji: Matte grey wireless over-ear headphones
  'Teknoloji': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',

  // Kırtasiye: Premium black notebook flatlay with metal pen
  'Kırtasiye': 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=800&auto=format&fit=crop',

  // Yapı Market: High-performance cordless power drill on dark wooden table
  'Yapı Market': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop',
  'Nalbur': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop',
  'Market': 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=800&auto=format&fit=crop',
};

export const getStudioCategoryImage = (categoryName?: string): string => {
  if (!categoryName) return CATEGORY_STUDIO_IMAGES['Senin Dükkanın'];
  return (
    CATEGORY_STUDIO_IMAGES[categoryName] ||
    CATEGORY_STUDIO_IMAGES[categoryName.trim()] ||
    CATEGORY_STUDIO_IMAGES['Senin Dükkanın']
  );
};
