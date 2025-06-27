import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  to?: string;
}

export function StatCard({ title, value, icon: Icon, description, className, to }: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="p-3 bg-primary-50 rounded-full">
        <Icon className="h-6 w-6 text-primary-600" />
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          "bg-white rounded-lg shadow-sm border border-gray-100 p-6 block hover:shadow-md transition-shadow duration-200 hover:border-primary-200",
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-100 p-6", className)}>
      {content}
    </div>
  );
}