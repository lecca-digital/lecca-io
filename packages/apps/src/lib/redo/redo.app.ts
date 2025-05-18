import { createApp } from '@lecca-io/toolkit';

import { getInvoice } from './actions/get-invoice.action';
import { getShippingRates } from './actions/get-shipping-rates.action';
import { listInvoices } from './actions/list-invoices.action';
import { listReturns } from './actions/list-returns.action';
import { redoApiKey } from './connections/redo.api-key';

export const redo = createApp({
  id: 'redo',
  name: 'Redo',
  description: 'Elevate your entire shopper experience.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/redo.svg',
  actions: [listReturns, getShippingRates, listInvoices, getInvoice],
  triggers: [],
  connections: [redoApiKey],
});
