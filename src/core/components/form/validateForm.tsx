import {
  EMAIL_MAX_LENGTH,
  LONG_TEXT_MAX_LENGTH,
  MEDIUM_TEXT_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
  TINY_TEXT_MAX_LENGTH,
  checkCodeValid,
  checkEmailValid,
  checkUrlValid,
} from '@core/helpers/string';
import { Util } from '@core/helpers/util';
import { baseConfig } from '../config/BaseConfig';
import { FieldMetadata, FieldName } from './generateForm';

export async function validateForm<FormValues extends object>(
  fields: Partial<{
    [key in FieldName<FormValues>]: FieldMetadata;
  }>,
  values: {
    [key in FieldName<FormValues>]: any;
  },
) {
  const errors: any = {};

  await Promise.all(
    Object.keys(fields).map(async (fieldName) => {
      const field = (fields as any)[fieldName] as FieldMetadata;
      const value = Util.get(values, fieldName) as any;
      const fieldErrors: string[] = [];

      if (!field) {
        throw new Error(`Field ${fieldName} not found!`);
      }
      if (!field.validate) {
        return;
      }

      if (field.validate.required) {
        if (field.type == 'array' || field.type == 'object_array') {
          if (!value || !value.length) {
            fieldErrors.push(baseConfig().formRequiredText);
          }
        } else if (field.type == 'number' && field.nullable) {
          if (value === undefined || value === null) {
            fieldErrors.push(baseConfig().formRequiredText);
          }
        } else {
          if (!value) {
            fieldErrors.push(baseConfig().formRequiredText);
          }
        }
      }
      if (field.validate.text && value) {
        const textValue = value as string;

        // check email
        if (
          field.validate.text.email &&
          (textValue.length >= EMAIL_MAX_LENGTH || !checkEmailValid(textValue))
        ) {
          fieldErrors.push(baseConfig().formEmailInvalid);
        }

        // check url
        if (field.validate.text.url && !checkUrlValid(textValue)) {
          fieldErrors.push(baseConfig().formUrlInvalid);
        }

        // check code
        if (field.validate.text.code && !checkCodeValid(textValue)) {
          fieldErrors.push(baseConfig().formCodeInvalid);
        }

        // check text length
        if (
          field.validate.text.tiny &&
          textValue.length > TINY_TEXT_MAX_LENGTH
        ) {
          fieldErrors.push(baseConfig().formTextTooLong);
        }
        if (
          field.validate.text.short &&
          textValue.length > SHORT_TEXT_MAX_LENGTH
        ) {
          fieldErrors.push(baseConfig().formTextTooLong);
        }
        if (
          field.validate.text.medium &&
          textValue.length > MEDIUM_TEXT_MAX_LENGTH
        ) {
          fieldErrors.push(baseConfig().formTextTooLong);
        }
        if (
          field.validate.text.long &&
          textValue.length > LONG_TEXT_MAX_LENGTH
        ) {
          fieldErrors.push(baseConfig().formTextTooLong);
        }
        // check min length
        if (
          field.validate.text.min !== undefined &&
          textValue.length < field.validate.text.min
        ) {
          fieldErrors.push(baseConfig().formMinText(field.validate.text.min));
        }
        // check max length
        if (
          field.validate.text.max !== undefined &&
          textValue.length > field.validate.text.max
        ) {
          fieldErrors.push(baseConfig().formMaxText(field.validate.text.max));
        }
      }
      if (field.validate.custom) {
        await Promise.all(
          Object.keys(field.validate.custom).map(async (key) => {
            const error = await field.validate!.custom![key](value, values);
            if (error) {
              fieldErrors.push(error);
            }
          }),
        );
      }

      if (fieldErrors.length) {
        errors[fieldName] = [...fieldErrors];
      }
    }),
  );

  return errors;
}
