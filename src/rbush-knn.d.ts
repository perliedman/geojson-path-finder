declare module "rbush-knn" {
  export default function knn<T>(
    tree: RBush<T>,
    x: number,
    y: number,
    n: number
  ): T[];
}
