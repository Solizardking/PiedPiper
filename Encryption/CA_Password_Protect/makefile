CC ?= cc
CFLAGS ?= -Wall -Wextra -g

.PHONY: all clean

all: encrypt

encrypt: prg.o util.o encryptor.o
	$(CC) $(CFLAGS) -o $@ $^

util.o: util.h util.c
	$(CC) $(CFLAGS) -c -o $@ util.c

prg.o: prg.h prg.c util.h
	$(CC) $(CFLAGS) -c -o $@ prg.c

encryptor.o: encryptor.h encryptor.c prg.h
	$(CC) $(CFLAGS) -c -o $@ encryptor.c

clean:
	rm -f *.o encrypt
