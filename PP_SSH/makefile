CC ?= cc
CFLAGS ?= -Wall -Wextra -g

.PHONY: all clean

all: client server

client: util.o prg.o client.h log.h client.c makefile
	$(CC) $(CFLAGS) -o client util.o prg.o client.c

server: util.o prg.o server.h log.h server.c makefile
	$(CC) $(CFLAGS) -o server util.o prg.o server.c

util.o: util.h util.c makefile
	$(CC) $(CFLAGS) -c util.c

prg.o: prg.h prg.c util.c util.h makefile
	$(CC) $(CFLAGS) -c prg.c

clean:
	rm -rf *.o client server client.dSYM server.dSYM tmp_*.txt


