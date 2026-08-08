declare module "@mapbox/polyline" {
  export function decode(
    string: string,
    precision?: number,
  ): Array<[number, number]>;
  export function encode(
    coordinates: Array<[number, number]>,
    precision?: number,
  ): string;
}
