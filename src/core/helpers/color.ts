// rgb(0, 0, 0) -> { r: 0, g: 0, b: 0}
export function parseRGBStringToRGB(str: string) {
  const rgbString = str.trim().replace('rgb(', '').replace(')', '');
  const strs = rgbString.split(', ');
  return {
    r: Number(strs[0]),
    g: Number(strs[1]),
    b: Number(strs[2]),
  };
}

// rgb(0, 0, 0) -> #000
export function parseRGBToHex(r: number, g: number, b: number) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

// white -> #fff
export function parseColorStringToHex(str: string) {
  const context = document.createElement('canvas').getContext('2d')!;
  context.fillStyle = str;
  return context.fillStyle;
}

export function getBackgroundColor(color: Color | undefined) {
  switch (color) {
    //semantics
    case 'brand':
      return 'bg-brand';
    case 'main':
      return 'bg-main';
    case 'sub':
      return 'bg-sub';
    case 'accent':
      return 'bg-accent';
    case 'info':
      return 'bg-info';
    case 'warning':
      return 'bg-warning';
    case 'success':
      return 'bg-success';
    case 'danger':
      return 'bg-danger';
    case 'neutral':
      return 'bg-neutral';
    case 'special':
      return 'bg-special';
    //palettes
    case 'red':
      return 'bg-red';
    case 'orange':
      return 'bg-orange';
    case 'yellow':
      return 'bg-yellow';
    case 'lime':
      return 'bg-lime';
    case 'green':
      return 'bg-green';
    case 'teal':
      return 'bg-teal';
    case 'cyan':
      return 'bg-cyan';
    case 'blue':
      return 'bg-blue';
    case 'indigo':
      return 'bg-indigo';
    case 'purple':
      return 'bg-purple';
    case 'pink':
      return 'bg-pink';
    case 'rose':
      return 'bg-rose';
    case 'slate':
      return 'bg-slate';
    case 'beige':
      return 'bg-beige';
    case 'black':
      return 'bg-black';
    case 'white':
      return 'bg-white';
    default:
      return '';
  }
}

export function getTextColor(color: Color | undefined) {
  switch (color) {
    //semantics
    case 'brand':
      return 'text-brand';
    case 'main':
      return 'text-main';
    case 'sub':
      return 'text-sub';
    case 'accent':
      return 'text-accent';
    case 'info':
      return 'text-info';
    case 'warning':
      return 'text-warning';
    case 'success':
      return 'text-success';
    case 'danger':
      return 'text-danger';
    case 'neutral':
      return 'text-neutral';
    case 'special':
      return 'text-special';
    //palettes
    case 'red':
      return 'text-red';
    case 'orange':
      return 'text-orange';
    case 'yellow':
      return 'text-yellow';
    case 'lime':
      return 'text-lime';
    case 'green':
      return 'text-green';
    case 'teal':
      return 'text-teal';
    case 'cyan':
      return 'text-cyan';
    case 'blue':
      return 'text-blue';
    case 'indigo':
      return 'text-indigo';
    case 'purple':
      return 'text-purple';
    case 'pink':
      return 'text-pink';
    case 'rose':
      return 'text-rose';
    case 'slate':
      return 'text-slate';
    case 'beige':
      return 'text-beige';
    case 'black':
      return 'text-black';
    case 'white':
      return 'text-white';
    default:
      return '';
  }
}
