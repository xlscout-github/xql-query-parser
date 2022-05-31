class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class Queue {
  constructor() {
    this.first = null;
    this.last = null;
    this.size = 0;
  }

  isEmpty() {
    return this.size === 0;
  }

  enqueue(value) {
    const node = new Node(value);

    if (this.first) {
      this.last.next = node;
      this.last = node;
    } else {
      this.first = node;
      this.last = node;
    }
    return ++this.size;
  }

  dequeue() {
    if (this.first) {
      const current = this.first;
      if (this.first === this.last) {
        this.last = null;
      }
      this.first = this.first.next;
      this.size--;
      return current.value;
    }
    return null;
  }
}

module.exports = Queue;
