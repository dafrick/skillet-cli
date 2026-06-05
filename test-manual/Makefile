CONTAINER ?= skillet-test-container
SOCKET    ?= $(or $(TMPDIR),/tmp)/claude-tmux-sockets/skillet.sock
SESSION   ?= skillet-test
IMAGE     ?= ubuntu:24.04

.PHONY: test-start test-teardown

test-start:
	mkdir -p $(dir $(SOCKET))
	-docker rm -f $(CONTAINER)
	docker run -d --name $(CONTAINER) $(IMAGE) sleep infinity
	-tmux -S "$(SOCKET)" kill-session -t $(SESSION)
	tmux -S "$(SOCKET)" new-session -d -s $(SESSION)
	tmux -S "$(SOCKET)" send-keys -t $(SESSION) "docker exec -it $(CONTAINER) bash" Enter
	@echo ""
	@echo "Test environment is ready."
	@echo ""
	@echo "To observe the session interactively:"
	@echo "  tmux -S \"$(SOCKET)\" attach -t $(SESSION)"
	@echo ""
	@echo "To send keys from scripts:"
	@echo "  tmux -S \"$(SOCKET)\" send-keys -t $(SESSION) \"<command>\" Enter"
	@echo ""

test-teardown:
	-tmux -S "$(SOCKET)" kill-session -t $(SESSION)
	-docker rm -f $(CONTAINER)
