import type { LanguageId } from './engine/languages';

export interface Sample {
  label: string;
  language: LanguageId;
  code: string;
}

export const SAMPLES: Sample[] = [
  {
    label: 'JS 异步',
    language: 'javascript',
    code: `// 高并发请求控制器
class RateLimiter {
  constructor(maxConcurrent = 5) {
    this.max = maxConcurrent;
    this.queue = [];
    this.running = 0;
  }

  async run(task) {
    if (this.running >= this.max) {
      await new Promise((r) => this.queue.push(r));
    }
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      this.queue.shift()?.();
    }
  }
}

const limiter = new RateLimiter(3);
const urls = ['https://api.dev/a', 'https://api.dev/b'];

const results = await Promise.all(
  urls.map((u) => limiter.run(() => fetch(u)))
);

console.log('done:', results.length);`,
  },
  {
    label: 'Python 算法',
    language: 'python',
    code: `# 快速排序：简洁的递归实现
def quick_sort(items):
    if len(items) <= 1:
        return items

    pivot = items[len(items) // 2]
    left = [x for x in items if x < pivot]
    middle = [x for x in items if x == pivot]
    right = [x for x in items if x > pivot]

    return quick_sort(left) + middle + quick_sort(right)


data = [33, 10, 55, 71, 29, 3, 18]
print("sorted:", quick_sort(data))`,
  },
  {
    label: 'TS 类型',
    language: 'typescript',
    code: `// 类型安全的事件总线
type Handler<T> = (payload: T) => void;

class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(event: K, fn: Handler<Events[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(fn as Handler<never>);
    this.handlers.set(event, set);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers.get(event)?.forEach((fn) => fn(payload as never));
  }
}

interface AppEvents {
  login: { userId: string };
  logout: undefined;
}

const bus = new EventBus<AppEvents>();
bus.on("login", ({ userId }) => console.log("hi", userId));
bus.emit("login", { userId: "u_1024" });`,
  },
  {
    label: 'Go 并发',
    language: 'go',
    code: `// worker 池：并发处理任务
package main

import (
	"fmt"
	"sync"
	"time"
)

func worker(id int, jobs <-chan int, wg *sync.WaitGroup) {
	defer wg.Done()
	for j := range jobs {
		fmt.Printf("worker %d 处理任务 %d\\n", id, j)
		time.Sleep(100 * time.Millisecond)
	}
}

func main() {
	jobs := make(chan int, 100)
	var wg sync.WaitGroup

	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go worker(w, jobs, &wg)
	}

	for j := 1; j <= 9; j++ {
		jobs <- j
	}
	close(jobs)
	wg.Wait()
	fmt.Println("全部任务完成")
}`,
  },
];
