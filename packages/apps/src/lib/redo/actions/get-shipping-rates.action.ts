import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const getShippingRates = createAction({
  id: 'redo_action_get-shipping-rates',
  name: 'Get Shipping Rates',
  description:
    'Get available shipping rates for a parcel based on the provided details',
  inputConfig: [
    {
      id: 'storeId',
      label: 'Store ID',
      description: 'Store ID',
      placeholder: 'Enter your Redo store ID',
      inputType: 'text',
      required: {
        missingMessage: 'Store ID is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'destinationCity',
      label: 'Destination City',
      description: 'City name for destination',
      placeholder: 'e.g., Seattle',
      inputType: 'text',
      required: {
        missingMessage: 'Destination city is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'destinationCountry',
      label: 'Destination Country',
      description: 'Country code for destination (e.g., US, CA)',
      placeholder: 'US',
      inputType: 'text',
      required: {
        missingMessage: 'Destination country is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'destinationLine1',
      label: 'Destination Address Line 1',
      description: 'Street address for destination, line 1',
      placeholder: 'e.g., 123 Main St',
      inputType: 'text',
      required: {
        missingMessage: 'Destination address line 1 is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'destinationLine2',
      label: 'Destination Address Line 2',
      description: 'Street address for destination, line 2',
      placeholder: 'e.g., Apt 4B (optional)',
      inputType: 'text',
    },
    {
      id: 'destinationPostalCode',
      label: 'Destination Postal Code',
      description: 'Postal or ZIP code for destination',
      placeholder: 'e.g., 98101',
      inputType: 'text',
      required: {
        missingMessage: 'Destination postal code is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'destinationState',
      label: 'Destination State',
      description: 'State or province for destination',
      placeholder: 'e.g., WA',
      inputType: 'text',
      required: {
        missingMessage: 'Destination state is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'originCity',
      label: 'Origin City',
      description: 'City name for origin',
      placeholder: 'e.g., Portland',
      inputType: 'text',
      required: {
        missingMessage: 'Origin city is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'originCountry',
      label: 'Origin Country',
      description: 'Country code for origin (e.g., US, CA)',
      placeholder: 'US',
      inputType: 'text',
      required: {
        missingMessage: 'Origin country is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'originLine1',
      label: 'Origin Address Line 1',
      description: 'Street address for origin, line 1',
      placeholder: 'e.g., 456 Pine St',
      inputType: 'text',
      required: {
        missingMessage: 'Origin address line 1 is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'originLine2',
      label: 'Origin Address Line 2',
      description: 'Street address for origin, line 2',
      placeholder: 'e.g., Suite 200 (optional)',
      inputType: 'text',
    },
    {
      id: 'originPostalCode',
      label: 'Origin Postal Code',
      description: 'Postal or ZIP code for origin',
      placeholder: 'e.g., 97201',
      inputType: 'text',
      required: {
        missingMessage: 'Origin postal code is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'originState',
      label: 'Origin State',
      description: 'State or province for origin',
      placeholder: 'e.g., OR',
      inputType: 'text',
      required: {
        missingMessage: 'Origin state is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelType',
      label: 'Parcel Type',
      description: 'Type of parcel (box, envelope, soft_pack)',
      placeholder: 'Select parcel type',
      inputType: 'select',
      selectOptions: [
        { value: 'box', label: 'Box' },
        { value: 'envelope', label: 'Envelope' },
        { value: 'soft_pack', label: 'Soft Pack' },
      ],
      required: {
        missingMessage: 'Parcel type is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelHeightUnit',
      label: 'Parcel Height Unit',
      description: 'Unit of measurement for height',
      placeholder: 'Select height unit',
      inputType: 'select',
      selectOptions: [
        { value: 'in', label: 'Inches (in)' },
        { value: 'cm', label: 'Centimeters (cm)' },
      ],
      required: {
        missingMessage: 'Height unit is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelHeightValue',
      label: 'Parcel Height',
      description: 'Numeric height value',
      placeholder: 'e.g., 10.5',
      inputType: 'number',
      required: {
        missingMessage: 'Height value is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelLengthUnit',
      label: 'Parcel Length Unit',
      description: 'Unit of measurement for length',
      placeholder: 'Select length unit',
      inputType: 'select',
      selectOptions: [
        { value: 'in', label: 'Inches (in)' },
        { value: 'cm', label: 'Centimeters (cm)' },
      ],
      required: {
        missingMessage: 'Length unit is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelLengthValue',
      label: 'Parcel Length',
      description: 'Numeric length value',
      placeholder: 'e.g., 12.0',
      inputType: 'number',
      required: {
        missingMessage: 'Length value is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelWidthUnit',
      label: 'Parcel Width Unit',
      description: 'Unit of measurement for width',
      placeholder: 'Select width unit',
      inputType: 'select',
      selectOptions: [
        { value: 'in', label: 'Inches (in)' },
        { value: 'cm', label: 'Centimeters (cm)' },
      ],
      required: {
        missingMessage: 'Width unit is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelWidthValue',
      label: 'Parcel Width',
      description: 'Numeric width value',
      placeholder: 'e.g., 8.25',
      inputType: 'number',
      required: {
        missingMessage: 'Width value is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelWeightUnit',
      label: 'Parcel Weight Unit',
      description: 'Unit of measurement for weight',
      placeholder: 'Select weight unit',
      inputType: 'select',
      selectOptions: [
        { value: 'g', label: 'Grams (g)' },
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'oz', label: 'Ounces (oz)' },
        { value: 'lb', label: 'Pounds (lb)' },
      ],
      required: {
        missingMessage: 'Weight unit is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'parcelWeightValue',
      label: 'Parcel Weight',
      description: 'Numeric weight value',
      placeholder: 'e.g., 2.5',
      inputType: 'number',
      required: {
        missingMessage: 'Weight value is required',
        missingStatus: 'warning',
      },
    },
  ],
  aiSchema: z.object({
    storeId: z.string().describe('Store ID'),
    destinationCity: z.string().describe('Destination city name'),
    destinationCountry: z.string().describe('Destination country code'),
    destinationLine1: z.string().describe('Destination street address, line 1'),
    destinationLine2: z.string().optional().describe('Destination street address, line 2'),
    destinationPostalCode: z.string().describe('Destination postal or ZIP code'),
    destinationState: z.string().describe('Destination state or province'),
    originCity: z.string().describe('Origin city name'),
    originCountry: z.string().describe('Origin country code'),
    originLine1: z.string().describe('Origin street address, line 1'),
    originLine2: z.string().optional().describe('Origin street address, line 2'),
    originPostalCode: z.string().describe('Origin postal or ZIP code'),
    originState: z.string().describe('Origin state or province'),
    parcelType: z.enum(['box', 'envelope', 'soft_pack']).describe('Parcel type'),
    parcelHeightUnit: z.enum(['in', 'cm']).describe('Height unit'),
    parcelHeightValue: z.number().min(0).describe('Numeric height value'),
    parcelLengthUnit: z.enum(['in', 'cm']).describe('Length unit'),
    parcelLengthValue: z.number().min(0).describe('Numeric length value'),
    parcelWidthUnit: z.enum(['in', 'cm']).describe('Width unit'),
    parcelWidthValue: z.number().min(0).describe('Numeric width value'),
    parcelWeightUnit: z.enum(['g', 'kg', 'oz', 'lb']).describe('Weight unit'),
    parcelWeightValue: z.number().min(0).describe('Numeric weight value'),
  }),
  run: async ({ connection, http, configValue, workspaceId }) => {
    const { apiKey } = connection;
    const {
      storeId,
      destinationCity,
      destinationCountry,
      destinationLine1,
      destinationLine2,
      destinationPostalCode,
      destinationState,
      originCity,
      originCountry,
      originLine1,
      originLine2,
      originPostalCode,
      originState,
      parcelType,
      parcelHeightUnit,
      parcelHeightValue,
      parcelLengthUnit,
      parcelLengthValue,
      parcelWidthUnit,
      parcelWidthValue,
      parcelWeightUnit,
      parcelWeightValue,
    } = configValue;

    // Prepare the request body
    const requestBody = {
      destination: {
        address: {
          city: destinationCity,
          country: destinationCountry,
          line1: destinationLine1,
          line2: destinationLine2 || '',
          postalCode: destinationPostalCode,
          state: destinationState,
        },
      },
      origin: {
        address: {
          city: originCity,
          country: originCountry,
          line1: originLine1,
          line2: originLine2 || '',
          postalCode: originPostalCode,
          state: originState,
        },
      },
      parcel: {
        type: parcelType,
        height: {
          unit: parcelHeightUnit,
          value: parcelHeightValue,
        },
        length: {
          unit: parcelLengthUnit,
          value: parcelLengthValue,
        },
        width: {
          unit: parcelWidthUnit,
          value: parcelWidthValue,
        },
        weight: {
          unit: parcelWeightUnit,
          value: parcelWeightValue,
        },
      },
    };

    const url = `https://api.getredo.com/v2.2/stores/${storeId}/shipments/rates`;

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await http.request({
      method: 'POST',
      url,
      workspaceId,
      headers,
      data: requestBody,
    });

    return response.data;
  },
  mockRun: async () => {
    return {
      rates: [
        {
          carrier: {
            id: 'usps',
            name: 'USPS',
          },
          price: {
            amount: '50.20',
            currency: 'USD',
          },
          service: {
            name: 'Priority',
          },
        },
        {
          carrier: {
            id: 'fedex',
            name: 'FedEx',
          },
          price: {
            amount: '75.50',
            currency: 'USD',
          },
          service: {
            name: 'Ground',
          },
        },
      ],
    };
  },
});
