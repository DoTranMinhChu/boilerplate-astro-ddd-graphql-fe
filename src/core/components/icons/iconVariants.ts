// add custom app specific icon variant, can override default ones
/* eslint @typescript-eslint/no-duplicate-enum-values: 0 */
export enum IconVariant {
  variant = 'placeholder', // require this so icon types is not broken
  keyFilled = 'tabler:key-filled',
  admin = 'tabler:user-cog',
  client = 'tabler:server-2',
  vendor = 'tabler:building-store',
  config = 'tabler:adjustments-cog',
  bankAccount = 'tabler:credit-card',
  bank = 'tabler:building-bank',
  unconnected = 'tabler:plug',
  connected = 'tabler:plug-connected',
}
