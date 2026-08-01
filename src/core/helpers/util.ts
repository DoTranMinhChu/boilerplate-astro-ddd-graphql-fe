import { customAlphabet } from 'nanoid';
import {
  assign,
  clone,
  cloneDeep,
  get,
  isEqual,
  merge,
  omit,
  set,
  unique,
} from 'radashi';
import { createUniqueId } from 'solid-js';

/** Generate Id mainly for UI. If you want to generate unique id, use generatePassword instead. */
export function generateId() {
  return createUniqueId();
}

const nanoAll = customAlphabet(
  `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`,
);
/** Generate a simple password. Can be used for fairly unique id. */
export function generatePassword(size: number = 16) {
  return nanoAll(size);
}

export class Util {
  static set = set;
  static get = get;
  static omit = omit;
  static isEqual = isEqual;
  static clone = clone;
  static merge = merge;
  static assign = assign;
  static unique = unique;
  static cloneDeep = cloneDeep;
}
