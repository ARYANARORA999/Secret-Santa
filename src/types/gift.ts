export type DeliveryStatus = 'pending' | 'partial' | 'delivered';

export interface GiftImage {
  id: string;
  url: string;
  caption?: string;
}

export interface Gift {
  id: string;
  fromName: string;
  toName: string;
  status: DeliveryStatus;
  images: GiftImage[];
  isUnlocked: boolean;
  message?: string;
  createdAt: Date;
}

export interface Participant {
  id: string;
  name: string;
}
