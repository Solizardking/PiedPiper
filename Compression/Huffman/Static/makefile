CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11

.PHONY: all clean

all: compress decompress

compress: huffman.o minHeap.o compress.o
	$(CC) $(CFLAGS) -o $@ $^

decompress: huffman.o codeSearchTree.o decompress.o
	$(CC) $(CFLAGS) -o $@ $^

huffman.o: huffman.c huffman.h
	$(CC) $(CFLAGS) -c -o $@ huffman.c

minHeap.o: minHeap.c minHeap.h
	$(CC) $(CFLAGS) -c -o $@ minHeap.c

compress.o: compress.c huffman.h minHeap.h
	$(CC) $(CFLAGS) -c -o $@ compress.c

decompress.o: decompress.c huffman.h codeSearchTree.h
	$(CC) $(CFLAGS) -c -o $@ decompress.c

codeSearchTree.o: codeSearchTree.c codeSearchTree.h
	$(CC) $(CFLAGS) -c -o $@ codeSearchTree.c

clean:
	rm -f *.o compress decompress
