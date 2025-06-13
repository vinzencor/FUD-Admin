import React from 'react';
import { MapPin, Star, Phone } from 'lucide-react';

interface FarmerCardProps {
  name: string;
  location: string;
  rating: number;
  image: string;
  phone: string;
  products: string[];
}

export function FarmerCard({ name, location, rating, image, phone, products }: FarmerCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="h-48 overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <div className="flex items-center mt-2 text-gray-600">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{location}</span>
        </div>
        <div className="flex items-center mt-2">
          <Star className="h-4 w-4 text-yellow-400" />
          <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center mt-2 text-gray-600">
          <Phone className="h-4 w-4 mr-1" />
          <span className="text-sm">{phone}</span>
        </div>
        <div className="mt-3">
          <p className="text-sm text-gray-600 font-medium">Products:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {products.map((product) => (
              <span
                key={product}
                className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full"
              >
                {product}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}