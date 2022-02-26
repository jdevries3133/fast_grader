It seems that bash removes newlines and whitespace from environment variables
and just presses it down into tokens, whereas zsh maintains newlines and
whitespaces. As a result, bash fucks up the kubernetes config file and
turns it into a string of tokens. I was testing the behavior on my termianl
and banging my head against the wall, not figuring out what was wrong.

It was only when I spun up an ec2 server to try to simulate the situation as
closely as possible that I realized what was going wrong. I am sure that I
can figure out how to fix this now.
