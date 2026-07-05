CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11 -g
COMMON_OBJS = filehandler.o model.o

.PHONY: all clean

all: compress decompress

compress: $(COMMON_OBJS) compressor.o
	$(CC) $(CFLAGS) -o $@ $^

decompress: $(COMMON_OBJS) decompressor.o
	$(CC) $(CFLAGS) -o $@ $^

filehandler.o: filehandler.h filehandler.c
	$(CC) $(CFLAGS) -c -o $@ filehandler.c

model.o: model.h model.c filehandler.h
	$(CC) $(CFLAGS) -c -o $@ model.c

compressor.o: compressor.c filehandler.h model.h
	$(CC) $(CFLAGS) -c -o $@ compressor.c

decompressor.o: decompressor.c filehandler.h model.h
	$(CC) $(CFLAGS) -c -o $@ decompressor.c

clean:
	rm -f *.o compress decompress
