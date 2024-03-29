type Cache = GoogleAppsScript.Cache.Cache;

class CounterCache {
  private readonly cache: Cache;

  public constructor() {
    this.cache = CacheService.getScriptCache();
  }

  public increment(key: string): number {
    const value: string = this.cache.get(key);
    let ret: number = 1;

    if (value) {
      ret = Number.parseInt(value, 10) + 1;
    }

    this.cache.put(key, ret.toString());

    return ret;
  }

  public decrement(key: string): number {
    const value: string = this.cache.get(key);
    let ret: number = 0;

    if (value) {
      ret = Number.parseInt(value, 10) - 1;
    }

    this.cache.put(key, ret.toString());

    return ret;
  }

  public reset(key: string): void {
    this.cache.remove(key);
  }
}

export { CounterCache };
