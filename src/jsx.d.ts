import { h, VNode } from 'preact';

declare global {
  namespace JSX {
    interface Element extends VNode<any> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
} 