import React from 'react';
import { HeroSection } from '../components/cover-image/HeroSection';
import { Button } from '../components/ui/button';
import { ArrowRight, Star, Users, ShoppingBag } from 'lucide-react';

export function HomePage() {
  return (
    <div className="bg-gray-50">
      {/* Hero Section with Dynamic Cover Image */}
      <HeroSection
        title="Welcome to FarmConnect"
        subtitle="Connecting farmers directly with consumers for fresh, local produce"
        showEditButton={true}
        imageFit="fill"
      >
        {/* Custom hero content */}
        <div className="text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            Farmers Underground: Directory
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
            {/* Discover the freshest produce from local farmers. Support your community while enjoying the best quality fruits and vegetables. */}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* <Button size="lg" className="bg-green-600 hover:bg-green-700">
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30">
              Learn More
            </Button> */}
          </div>
        </div>
      </HeroSection>

      {/* Features Section */}
      
    </div>
  );
}
