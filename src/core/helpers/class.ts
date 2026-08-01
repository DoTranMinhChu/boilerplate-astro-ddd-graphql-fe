import { ClassNameValue, extendTailwindMerge, twJoin } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: ['xsm'],
        },
      ],
    },
  },
});

export const mergeClass = (...classLists: ClassNameValue[]) => {
  return twMerge(classLists.filter(Boolean));
};
export const joinClass = (...classLists: ClassNameValue[]) => {
  return twJoin(classLists.filter(Boolean));
};
export const getCol = (col: Col | undefined) => {
  return col
    ? {
        1: 'col-span-1',
        2: 'col-span-2',
        3: 'col-span-3',
        4: 'col-span-4',
        5: 'col-span-5',
        6: 'col-span-6',
        7: 'col-span-7',
        8: 'col-span-8',
        9: 'col-span-9',
        10: 'col-span-10',
        11: 'col-span-11',
        12: 'col-span-12',
      }[col]
    : 'col-span-full';
};
