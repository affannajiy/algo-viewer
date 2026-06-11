// Pure sorting algorithms. Each returns an array of frames:
// { array: number[], comparing: [i,j]|[], swapped: [i,j]|[], sorted: number[] }
// Visualisation steps through frames; algorithms never mutate UI state.

function frame(array, comparing = [], swapped = [], sorted = []) {
  return { array: [...array], comparing, swapped, sorted: [...sorted] }
}

export function bubbleSort(input) {
  const a = [...input]
  const frames = []
  const sorted = []
  const n = a.length
  for (let i = 0; i < n - 1; i++) {
    let didSwap = false
    for (let j = 0; j < n - i - 1; j++) {
      frames.push(frame(a, [j, j + 1], [], sorted))
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        didSwap = true
        frames.push(frame(a, [], [j, j + 1], sorted))
      }
    }
    sorted.unshift(n - i - 1)
    frames.push(frame(a, [], [], sorted))
    if (!didSwap) break
  }
  frames.push(frame(a, [], [], a.map((_, i) => i)))
  return frames
}

export function selectionSort(input) {
  const a = [...input]
  const frames = []
  const sorted = []
  const n = a.length
  for (let i = 0; i < n - 1; i++) {
    let min = i
    for (let j = i + 1; j < n; j++) {
      frames.push(frame(a, [min, j], [], sorted))
      if (a[j] < a[min]) min = j
    }
    if (min !== i) {
      ;[a[i], a[min]] = [a[min], a[i]]
      frames.push(frame(a, [], [i, min], sorted))
    }
    sorted.push(i)
    frames.push(frame(a, [], [], sorted))
  }
  frames.push(frame(a, [], [], a.map((_, i) => i)))
  return frames
}

export function insertionSort(input) {
  const a = [...input]
  const frames = []
  const n = a.length
  for (let i = 1; i < n; i++) {
    const key = a[i]
    let j = i - 1
    frames.push(frame(a, [i, j], []))
    while (j >= 0 && a[j] > key) {
      frames.push(frame(a, [j, j + 1], []))
      a[j + 1] = a[j]
      frames.push(frame(a, [], [j, j + 1]))
      j--
    }
    a[j + 1] = key
    frames.push(frame(a, [], [j + 1]))
  }
  frames.push(frame(a, [], [], a.map((_, i) => i)))
  return frames
}

export function mergeSort(input) {
  const a = [...input]
  const frames = []
  function merge(lo, mid, hi) {
    const left = a.slice(lo, mid + 1)
    const right = a.slice(mid + 1, hi + 1)
    let i = 0,
      j = 0,
      k = lo
    while (i < left.length && j < right.length) {
      frames.push(frame(a, [lo + i, mid + 1 + j], []))
      if (left[i] <= right[j]) a[k] = left[i++]
      else a[k] = right[j++]
      frames.push(frame(a, [], [k]))
      k++
    }
    while (i < left.length) {
      a[k] = left[i++]
      frames.push(frame(a, [], [k]))
      k++
    }
    while (j < right.length) {
      a[k] = right[j++]
      frames.push(frame(a, [], [k]))
      k++
    }
  }
  function sort(lo, hi) {
    if (lo >= hi) return
    const mid = Math.floor((lo + hi) / 2)
    sort(lo, mid)
    sort(mid + 1, hi)
    merge(lo, mid, hi)
  }
  sort(0, a.length - 1)
  frames.push(frame(a, [], [], a.map((_, i) => i)))
  return frames
}

export function quickSort(input) {
  const a = [...input]
  const frames = []
  const sorted = []
  function partition(lo, hi) {
    const pivot = a[hi]
    let i = lo - 1
    for (let j = lo; j < hi; j++) {
      frames.push(frame(a, [j, hi], [], sorted))
      if (a[j] < pivot) {
        i++
        if (i !== j) {
          ;[a[i], a[j]] = [a[j], a[i]]
          frames.push(frame(a, [], [i, j], sorted))
        }
      }
    }
    ;[a[i + 1], a[hi]] = [a[hi], a[i + 1]]
    frames.push(frame(a, [], [i + 1, hi], sorted))
    return i + 1
  }
  function sort(lo, hi) {
    if (lo > hi) return
    if (lo === hi) {
      sorted.push(lo)
      frames.push(frame(a, [], [], sorted))
      return
    }
    const p = partition(lo, hi)
    sorted.push(p)
    frames.push(frame(a, [], [], sorted))
    sort(lo, p - 1)
    sort(p + 1, hi)
  }
  sort(0, a.length - 1)
  frames.push(frame(a, [], [], a.map((_, i) => i)))
  return frames
}

export function heapSort(input) {
  const a = [...input]
  const frames = []
  const sorted = []
  const n = a.length
  function heapify(size, root) {
    let largest = root
    const l = 2 * root + 1
    const r = 2 * root + 2
    if (l < size) {
      frames.push(frame(a, [l, largest], [], sorted))
      if (a[l] > a[largest]) largest = l
    }
    if (r < size) {
      frames.push(frame(a, [r, largest], [], sorted))
      if (a[r] > a[largest]) largest = r
    }
    if (largest !== root) {
      ;[a[root], a[largest]] = [a[largest], a[root]]
      frames.push(frame(a, [], [root, largest], sorted))
      heapify(size, largest)
    }
  }
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i)
  for (let i = n - 1; i > 0; i--) {
    ;[a[0], a[i]] = [a[i], a[0]]
    frames.push(frame(a, [], [0, i], sorted))
    sorted.unshift(i)
    frames.push(frame(a, [], [], sorted))
    heapify(i, 0)
  }
  frames.push(frame(a, [], [], a.map((_, i) => i)))
  return frames
}

export const SORTING_ALGORITHMS = {
  bubble: {
    name: 'Bubble Sort',
    fn: bubbleSort,
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    description:
      'Repeatedly steps through the list, swapping adjacent elements that are out of order. Largest values "bubble" to the end each pass.',
  },
  selection: {
    name: 'Selection Sort',
    fn: selectionSort,
    complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    description:
      'Finds the minimum of the unsorted region and swaps it into place. Few swaps, many comparisons.',
  },
  insertion: {
    name: 'Insertion Sort',
    fn: insertionSort,
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    description:
      'Builds the sorted array one element at a time by inserting each item into its correct position. Fast on nearly-sorted data.',
  },
  merge: {
    name: 'Merge Sort',
    fn: mergeSort,
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    description:
      'Divide and conquer: recursively splits the array in half, sorts each half, then merges. Guaranteed n log n.',
  },
  quick: {
    name: 'Quick Sort',
    fn: quickSort,
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    description:
      'Picks a pivot, partitions smaller values left and larger right, then recurses. Usually fastest in practice.',
  },
  heap: {
    name: 'Heap Sort',
    fn: heapSort,
    complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
    description:
      'Builds a max-heap, then repeatedly extracts the maximum to the end. In-place with guaranteed n log n.',
  },
}
