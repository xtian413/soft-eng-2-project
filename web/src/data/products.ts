export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  description: string;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Smart FitBand 5',
    category: 'Wearables',
    price: 99.99,
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500&auto=format&fit=crop&q=60',
    rating: 4.7,
    description: 'Track your heart rate, sleep quality, and workouts with ease. 14-day battery life.',
  },
  {
    id: '2',
    name: 'Acoustic Sport Buds',
    category: 'Audio',
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60',
    rating: 4.5,
    description: 'Sweat-resistant, true wireless earbuds designed to stay secure during high-intensity training.',
  },
  {
    id: '3',
    name: 'Ergonomic Kettlebell 16kg',
    category: 'Strength',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500&auto=format&fit=crop&q=60',
    rating: 4.9,
    description: 'Cast iron kettlebell with a smooth, comfortable grip for crossfit and strength building.',
  },
  {
    id: '4',
    name: 'Non-Slip Eco Yoga Mat',
    category: 'Yoga & Pilates',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&auto=format&fit=crop&q=60',
    rating: 4.8,
    description: 'Biodegradable TPE yoga mat with dual-sided non-slip texture and alignment lines.',
  },
];
