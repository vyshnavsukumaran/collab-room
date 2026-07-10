import Image from "next/image";
import Link from "next/link";

export default function Shop() {
  // Mock product data - in a real app, this would come from an API
  const products = [
    {
      id: 1,
      name: "Classic Solitaire Ring",
      image: "/placeholder-ring.jpg",
      price: 1299,
      category: "Rings",
    },
    {
      id: 2,
      name: "Pearl Drop Earrings",
      image: "/placeholder-earrings.jpg",
      price: 899,
      category: "Earrings",
    },
    {
      id: 3,
      name: "Gold Chain Necklace",
      image: "/placeholder-necklace.jpg",
      price: 1599,
      category: "Necklaces",
    },
    {
      id: 4,
      name: "Diamond Tennis Bracelet",
      image: "/placeholder-bracelet.jpg",
      price: 2299,
      category: "Bracelets",
    },
    {
      id: 5,
      name: "Vintage Cocktail Ring",
      image: "/placeholder-cocktail-ring.jpg",
      price: 1899,
      category: "Rings",
    },
    {
      id: 6,
      name: "Gold Hoop Earrings",
      image: "/placeholder-hoop-earrings.jpg",
      price: 799,
      category: "Earrings",
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-serif text-center">Shop Our Collection</h1>
          <p className="text-lg text-center text-foreground/60 mt-4">
            Explore our carefully curated collection of timeless jewelry pieces
          </p>
        </div>

        {/* Filters */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 sm:flex-shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus-ring-gold focus:ring-offset-2 sm:max-w-xs">
              <option value="">All Categories</option>
              <option value="rings">Rings</option>
              <option value="earrings">Earrings</option>
              <option value="necklaces">Necklaces</option>
              <option value="bracelets">Bracelets</option>
            </select>
          </div>

          <div className="flex-1 sm:flex-shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">
              Price Range
            </label>
            <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus-ring-gold focus:ring-offset-2 sm:max-w-xs">
              <option value="">Any Price</option>
              <option value="0-500">Under $500</option>
              <option value="500-1000">$500 - $1,000</option>
              <option value="1000-2000">$1,000 - $2,000</option>
              <option value="2000-above">Over $2,000</option>
            </select>
          </div>

          <div className="flex-1 sm:flex-shrink-0 flex sm:justify-end">
            <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus-ring-gold focus:ring-offset-2 sm:max-w-xs">
              <option value="featured">Featured</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              className="group"
            >
              <div className="bg-background hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-gold/20">
                <div className="relative aspect-w-3 aspect-h-4">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    priority
                  />
                  {/* Optional: Add a subtle overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-opacity duration-300"></div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-foreground/60 mb-3">{product.category}</p>
                  <p className="text-xl font-semibold text-foreground">${product.price.toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}