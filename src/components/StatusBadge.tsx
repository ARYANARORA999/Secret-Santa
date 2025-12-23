import { DeliveryStatus } from '@/types/gift';
import { Package, PackageCheck, Truck } from 'lucide-react';

interface StatusBadgeProps {
  status: DeliveryStatus;
}

const statusConfig = {
  pending: {
    label: 'On the way',
    icon: Truck,
    className: 'bg-accent/20 text-accent-foreground border-accent/30',
  },
  partial: {
    label: 'Partially delivered',
    icon: Package,
    className: 'bg-christmas-gold/20 text-christmas-dark border-christmas-gold/30',
  },
  delivered: {
    label: 'Delivered',
    icon: PackageCheck,
    className: 'bg-secondary/20 text-secondary border-secondary/30',
  },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
