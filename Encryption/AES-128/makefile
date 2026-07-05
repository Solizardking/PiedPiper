CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11

.PHONY: all clean

all: encrypt decrypt

encrypt: encrypt.o expandKeys.o standardDefinitions.o
	$(CC) $(CFLAGS) -o $@ $^

decrypt: decrypt.o expandKeys.o standardDefinitions.o
	$(CC) $(CFLAGS) -o $@ $^

encrypt.o: encrypt.c standardDefinitions.h expandKeys.h
	$(CC) $(CFLAGS) -c -o $@ encrypt.c

decrypt.o: decrypt.c standardDefinitions.h expandKeys.h
	$(CC) $(CFLAGS) -c -o $@ decrypt.c

expandKeys.o: expandKeys.c expandKeys.h standardDefinitions.h
	$(CC) $(CFLAGS) -c -o $@ expandKeys.c

standardDefinitions.o: standardDefinitions.c standardDefinitions.h
	$(CC) $(CFLAGS) -c -o $@ standardDefinitions.c

clean:
	rm -f decrypt.o encrypt.o expandKeys.o standardDefinitions.o encrypt decrypt
