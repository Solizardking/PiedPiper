CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11

.PHONY: all clean test

all: hashF caHash

hashF: sha512.c
	$(CC) $(CFLAGS) -o $@ sha512.c

caHash: hash.c
	$(CC) $(CFLAGS) -o $@ hash.c

test: all
	./hashF abc
	./caHash abc

clean:
	rm -f hashF caHash
