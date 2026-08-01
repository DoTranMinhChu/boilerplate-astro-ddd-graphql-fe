type CompatibleDocument = {
  parentWindow?: Window;
} & Document;

export class Dom {
  static getRoot = (id: string, rootClass?: string) => {
    let root = document.getElementById(id) as HTMLDivElement;
    if (!root) {
      root = document.createElement('div');
      root.id = id;
      root.className = rootClass || '';
      const appRoot =
        document.getElementById('root') || document.getElementById('app');
      if (!appRoot) {
        throw new Error('Root not found!');
      }
      appRoot.appendChild(root);
    }
    return root;
  };

  static getScroll = (w: Window, top?: boolean): number => {
    let ret = w[`page${top ? 'Y' : 'X'}Offset`];
    const method = `scroll${top ? 'Top' : 'Left'}`;
    if (typeof ret !== 'number') {
      const d = w.document;
      ret = (d.documentElement as any)[method];
      if (typeof ret !== 'number') {
        ret = (d.body as any)[method];
      }
    }
    return ret;
  };

  static getOffset = (el: Element) => {
    const rect = el.getBoundingClientRect();
    const pos = {
      left: rect.left,
      top: rect.top,
    };
    const doc = el.ownerDocument as CompatibleDocument;
    const w = doc.defaultView || doc.parentWindow;
    pos.left += this.getScroll(w as Window);
    pos.top += this.getScroll(w as Window, true);
    return pos;
  };

  static getVisibleBoundingRect = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // Calculate the visible bounding rect within the viewport
    const visibleRect = {
      top: Math.max(rect.top, 0),
      left: Math.max(rect.left, 0),
      bottom: Math.min(rect.bottom, viewportHeight),
      right: Math.min(rect.right, viewportWidth),
    };

    return {
      ...visibleRect,
      height: visibleRect.bottom - visibleRect.top,
      width: visibleRect.right - visibleRect.left,
    };
  };

  static isChildOfElementWithId = (
    childElement: HTMLElement,
    parentId: string,
  ) => {
    const parentElement = document.getElementById(parentId);

    if (!parentElement) {
      console.error(`Parent element with ID '${parentId}' not found.`);
      return false;
    }

    return parentElement.contains(childElement);
  };

  static blurActiveElement = () => {
    (document.activeElement as HTMLElement)?.blur();
  };
}
