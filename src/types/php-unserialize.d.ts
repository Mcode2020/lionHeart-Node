declare module "php-unserialize" {
  export function unserialize(input: string): any;
  export function serialize(input: any): string;
}
