// 파일 용도: 외부 명령 실행과 stdout/stderr 캡처 로직을 구현한다.
#include "core/command_runner.h"

#include <array>
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstring>
#include <fcntl.h>
#include <poll.h>
#include <sys/wait.h>
#include <unistd.h>

namespace {

void AppendPipeOutput(int fd, std::string* output, bool* open) {
    std::array<char, 4096> buffer{};
    while (true) {
        const ssize_t read_size = ::read(fd, buffer.data(), buffer.size());
        if (read_size > 0) {
            output->append(buffer.data(), static_cast<std::size_t>(read_size));
            continue;
        }
        if (read_size == 0) {
            *open = false;
            return;
        }
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
            return;
        }
        *open = false;
        return;
    }
}

bool MakeNonBlocking(int fd, std::string* error_message) {
    const int flags = ::fcntl(fd, F_GETFL, 0);
    if (flags < 0 || ::fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
        if (error_message != nullptr) {
            *error_message = std::string("failed to set pipe nonblocking: ") + std::strerror(errno);
        }
        return false;
    }
    return true;
}

}  // namespace

namespace core {

CommandResult RunCommandCapture(const std::vector<std::string>& args, int timeout_ms) {
    CommandResult result;
    if (args.empty()) {
        result.error_message = "empty command";
        return result;
    }

    int stdout_pipe[2]{-1, -1};
    int stderr_pipe[2]{-1, -1};
    if (::pipe(stdout_pipe) != 0 || ::pipe(stderr_pipe) != 0) {
        result.error_message = std::string("failed to create process pipe: ") + std::strerror(errno);
        if (stdout_pipe[0] >= 0) {
            ::close(stdout_pipe[0]);
        }
        if (stdout_pipe[1] >= 0) {
            ::close(stdout_pipe[1]);
        }
        if (stderr_pipe[0] >= 0) {
            ::close(stderr_pipe[0]);
        }
        if (stderr_pipe[1] >= 0) {
            ::close(stderr_pipe[1]);
        }
        return result;
    }

    const pid_t pid = ::fork();
    if (pid < 0) {
        result.error_message = std::string("failed to fork process: ") + std::strerror(errno);
        ::close(stdout_pipe[0]);
        ::close(stdout_pipe[1]);
        ::close(stderr_pipe[0]);
        ::close(stderr_pipe[1]);
        return result;
    }

    if (pid == 0) {
        ::dup2(stdout_pipe[1], STDOUT_FILENO);
        ::dup2(stderr_pipe[1], STDERR_FILENO);
        ::close(stdout_pipe[0]);
        ::close(stdout_pipe[1]);
        ::close(stderr_pipe[0]);
        ::close(stderr_pipe[1]);

        std::vector<char*> argv;
        argv.reserve(args.size() + 1);
        for (const std::string& arg : args) {
            argv.push_back(const_cast<char*>(arg.c_str()));
        }
        argv.push_back(nullptr);
        ::execvp(argv[0], argv.data());
        ::_exit(127);
    }

    ::close(stdout_pipe[1]);
    ::close(stderr_pipe[1]);
    if (!MakeNonBlocking(stdout_pipe[0], &result.error_message) ||
        !MakeNonBlocking(stderr_pipe[0], &result.error_message)) {
        ::kill(pid, SIGKILL);
        ::close(stdout_pipe[0]);
        ::close(stderr_pipe[0]);
        ::waitpid(pid, nullptr, 0);
        return result;
    }

    bool stdout_open = true;
    bool stderr_open = true;
    bool child_exited = false;
    int status = 0;
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);

    while (stdout_open || stderr_open || !child_exited) {
        if (!child_exited) {
            const pid_t waited = ::waitpid(pid, &status, WNOHANG);
            if (waited == pid) {
                child_exited = true;
            }
        }

        if (!child_exited && std::chrono::steady_clock::now() >= deadline) {
            result.timed_out = true;
            ::kill(pid, SIGKILL);
            ::waitpid(pid, &status, 0);
            child_exited = true;
        }

        std::array<pollfd, 2> fds{};
        nfds_t nfds = 0;
        if (stdout_open) {
            fds[nfds++] = pollfd{stdout_pipe[0], POLLIN | POLLHUP | POLLERR, 0};
        }
        if (stderr_open) {
            fds[nfds++] = pollfd{stderr_pipe[0], POLLIN | POLLHUP | POLLERR, 0};
        }

        if (nfds > 0) {
            const int wait_ms = child_exited ? 0 : 100;
            const int polled = ::poll(fds.data(), nfds, wait_ms);
            if (polled > 0) {
                nfds_t index = 0;
                if (stdout_open) {
                    if ((fds[index].revents & (POLLIN | POLLHUP | POLLERR)) != 0) {
                        AppendPipeOutput(stdout_pipe[0], &result.stdout_text, &stdout_open);
                    }
                    ++index;
                }
                if (stderr_open) {
                    if ((fds[index].revents & (POLLIN | POLLHUP | POLLERR)) != 0) {
                        AppendPipeOutput(stderr_pipe[0], &result.stderr_text, &stderr_open);
                    }
                }
            } else if (polled < 0 && errno != EINTR) {
                result.error_message = std::string("command poll failed: ") + std::strerror(errno);
                break;
            }
        }

        if (child_exited && !stdout_open && !stderr_open) {
            break;
        }
    }

    if (!child_exited) {
        ::kill(pid, SIGKILL);
        ::waitpid(pid, &status, 0);
    }
    if (stdout_open) {
        AppendPipeOutput(stdout_pipe[0], &result.stdout_text, &stdout_open);
    }
    if (stderr_open) {
        AppendPipeOutput(stderr_pipe[0], &result.stderr_text, &stderr_open);
    }
    ::close(stdout_pipe[0]);
    ::close(stderr_pipe[0]);

    if (WIFEXITED(status)) {
        result.exit_code = WEXITSTATUS(status);
    } else if (WIFSIGNALED(status)) {
        result.exit_code = 128 + WTERMSIG(status);
    }
    return result;
}

}  // namespace core
