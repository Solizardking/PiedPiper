#include <stdio.h>
#include <sys/socket.h>
#include <stdlib.h>
#include <unistd.h>
#include <netinet/in.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include "log.h"
#include "server.h"
#include "prg.h"
#define PORT 8000
#define BUFFER_LENGTH (100 * 1024 * 1024L)

#ifndef O_LARGEFILE
#define O_LARGEFILE 0
#endif

void encryptFunction(char *command)
{
    size_t len = strlen(command);
    for (size_t x = 0; x < len; x++)
    {
        command[x] = (command[x] ^ ((unsigned char)getNum()));
        if (command[x] == '\0' || command[x] == '\255')
        {
            command[x] = 'A';
        }
    }
}

void showHex(char *command)
{
    size_t len = strlen(command);
    char hs[len * 2 + 1];
    for (size_t x = 0; x < len; x++)
    {
        hs[2 * x] = command[x];
        hs[2 * x + 1] = command[x] >> 4;
        if ((hs[2 * x] & 0x0F) >= 10)
        {
            hs[2 * x] = (hs[2 * x] & 0x0F) + 'A' - 10;
        }
        else
        {
            hs[2 * x] = (hs[2 * x] & 0xF0) + '0';
        }

        if ((hs[2 * x + 1] & 0x0F) >= 10)
        {
            hs[2 * x + 1] = (hs[2 * x + 1] & 0x0F) + 'A' - 10;
        }
        else
        {
            hs[2 * x + 1] = (hs[2 * x + 1] & 0xF0) + '0';
        }
    }
    hs[len * 2] = '\0';
    // printf("\n");
    printf(" HEX String :: %s\n", hs);
}

int strcompare(char *s1, char *s2)
{
    if (strlen(s1) > strlen(s2))
    {
        return 0;
    }
    for (size_t x = 0; x < strlen(s1); x++)
    {
        if (s1[x] != s2[x])
        {
            return 0;
        }
    }

    return 1;
}

void recAck(int fd)
{
    // int rl = 0;

    // do
    // {
    char *ack = (char *)calloc(100, 1);
    read(fd, ack, 100);
    free(ack);
    //     rl = strlen(ack);
    //     if (strlen(ack) != 0)
    //     {
    // printf("Recieved acknowledgement\n");
    //         free(ack);
    //         return;
    //     }
    //     free(ack);
    // } while (rl == 0);
}

void sendAck(int fd)
{
    send(fd, "ack", 3, 0);
    // printf("Sent acknowledgement\n");
}

char *trimString(char *str)
{
    char *ret = (char *)calloc(1024, 1);
    int ind = 0, flag = 0;
    int lastIndex = strlen(str) - 1;
    while (lastIndex >= 0)
    {
        if (str[lastIndex] != ' ' && str[lastIndex] != '\n' && str[lastIndex] != '\t')
        {
            break;
        }
        lastIndex--;
    }
    for (int x = 0; x <= lastIndex; x++)
    {
        if (str[x] != ' ' && str[x] != '\t')
        {
            flag = 1;
        }
        if (flag != 0)
        {
            ret[ind++] = str[x];
        }
    }
    ret[ind] = '\0';
    return ret;
}

int understand(char *msg, int new_socket, int c_name)
{
    char fn[13] = {' ', '>', ' ', 't', 'm', 'p', '_', ('0' + c_name), '.', 't', 'x', 't'};
    // char *rmc = (char *)calloc(MINLEN, 1);
    char rmc[20] = "rm -rf tmp_0.txt";
    rmc[11] = '0' + c_name;
    // printf("c_name is : %d %s %s\n", c_name, fn, rmc);
    // fflush(stdout);

    recAck(new_socket); // ready to accept new message
    if (strcompare("exit", msg))
    {
        printf("Exit Command\n");
        // fflush(stdout);
        // exit the function
        char ss[3] = "BYE";
        encryptFunction(ss);
        send(new_socket, ss, 3, 0);
        return 1;
    }
    char *str = (char *)calloc(MINLEN * 5, 1);
    // strcat(rmc, &(fn[3]));
    // printf("Filename : %s\nRemove command is %s\nClient is %d\n", fn, rmc, c_name);
    // fflush(stdout);
    strcat(msg, fn);
    // printf("Command is %s", msg);
    system(msg);
    int fd1 = open(&(fn[3]), O_RDONLY | O_LARGEFILE | O_CREAT, 0666);
    if (fd1 < 0)
    {
        printf("Invalid file error\n");
        char ss[3] = "INV";
        encryptFunction(ss);
        send(new_socket, ss, 3, 0);
        free(str);
        return 0;
    }
    int rl = 1;
    rl = read(fd1, str, MINLEN * 5);
    printf("[ debug ] %s is str,ms is %s\n", str, msg);
    // encrypt
    if (rl == 0)
    {
        printf("Empty Command\n");
        char ss[3] = "EOP"; // empty output
        encryptFunction(ss);
        send(new_socket, ss, 3, 0);
        system(rmc);
        recAck(new_socket); // receives acknowledgement from client for command completed
        close(fd1);
        free(str);
        return 0;
    }
    encryptFunction(str);
    // showHex(str);
    send(new_socket, str, rl, 0); // sends command response

    if (str != NULL)
        free(str);      // ERROR HERE
    recAck(new_socket); // receives acknowledgement from client for command completed
    close(fd1);
    system(rmc);
    return 0;
}

int main(int argc, char const *argv[])
{
    (void)argc;
    (void)argv;

    int server_fd, new_socket, valread;
    struct sockaddr_in address;
    int opt = 1;
    socklen_t addrlen = sizeof(address);
    // char *hello = "Hello from server";

    // Creating socket file descriptor
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) // creates socket, SOCK_STREAM is for TCP. SOCK_DGRAM for UDP
    {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }

    // This is to lose the pesky "Address already in use" error message.
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt))) // SOL_SOCKET is the socket layer itself
    {
        perror("setsockopt SO_REUSEADDR");
        exit(EXIT_FAILURE);
    }
#ifdef SO_REUSEPORT
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt)))
    {
        perror("setsockopt SO_REUSEPORT");
        exit(EXIT_FAILURE);
    }
#endif
    address.sin_family = AF_INET;         // Address family. For IPv6, it's AF_INET6. 29 others exist like AF_UNIX etc.
    address.sin_addr.s_addr = INADDR_ANY; // Accept connections from any IP address - listens from all interfaces.
    address.sin_port = htons(PORT);       // Server port to open. Htons converts to Big Endian - Left to Right. RTL is Little Endian

    // Forcefully attaching socket to the port 8080
    if (bind(server_fd, (struct sockaddr *)&address,
             sizeof(address)) < 0)
    {
        perror("bind failed");
        exit(EXIT_FAILURE);
    }

    // Port bind is done. You want to wait for incoming connections and handle them in some way.
    // The process is two step: first you listen(), then you accept()
    int ll = listen(server_fd, 3);
    if (ll < 0) // 3 is the maximum size of queue - connections you haven't accepted
    {
        perror("listen");
        exit(EXIT_FAILURE);
    }
    int pid;
    static int counter = 0;
    for (;;)
    {
        // label to go to on fork
    a:
        new_socket = accept(server_fd, (struct sockaddr *)&address, &addrlen);
        if (new_socket < 0)
        {
            perror("accept");
            continue;
        }

        if ((pid = fork()) == -1)
        {
            close(new_socket);
            continue;
        }
        else if (pid > 0)
        {
            counter++;
            //wait();
            // code for server continue here
            goto a;
            // printf("here2");
            //close(new);
            // continue;
        }
        else if (pid == 0)
        {
            counter++;
            printf("Client %d has joined the server\n", counter);
            initMain((unsigned char *)"PASSWORD1234", 12);
            // code for all clients here
            while (1)
            {
                char *buffer = (char *)calloc(1024, 1);
                valread = read(new_socket, buffer, 1024); // accepts the command
                if (valread <= 0)
                {
                    free(buffer);
                    break;
                }
                // showHex(buffer);
                encryptFunction(buffer);
                printf("Command is %s\n", buffer);
                sendAck(new_socket); // sends acknowledgement for command recieved
                // no need to trim string

                if (understand(buffer, new_socket, counter)) // interpret the command
                {
                    sendAck(new_socket); // sends acknowledgement for command
                    free(buffer);
                    break;               // in case of exit
                }
                free(buffer);
                sendAck(new_socket); // send acknowledgement for command completed
            }
            printf("Client %d has left the server\n", counter);
        }
    }
    close(server_fd);
    return 0;
}
