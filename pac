#!/usr/bin/env bash

GREEN=$(tput setaf 2)
BLUE=$(tput setaf 4)

BOLD=$(tput bold)
RESET=$(tput sgr0)

help="\
pac v1.0 - A pacman maintenance utility

Usage: $(basename $0) [options]

Options:
  clean     Clean the package cache
  config    Find .pacnew and .pacsave files
  count     Print the number of packages installed
  cycle     Find dependency cycles
  explicit  List explicit packages
  foreign   List foreign packages
  help      Print this help message
  modified  List modified files
  optional  List optional packages
  remove    Remove orphans

Environment Variables:
  PAC        Command to use when upgrading the system
             By default, a recognized AUR helper is used
             If none are found, 'sudo pacman -Syu' is run

  PAC_CLEAN  Options to use during 'clean'
             By default, '-rvuk0' is used

By default, pac upgrades the system\
"

print_packages(){
	expac -HM '%n|%m|%d' $(comm -23 "$1" <(pacman -Qqg base base-devel | sort)) | column -s '|'  -t
}

if [ $# -eq 0 ]; then
	if [ -n "$PAC" ]; then
		$PAC
	elif hash trizen &> /dev/null; then
		trizen -Syu
	elif hash yay &> /dev/null; then
		yay -Syu
	else
		sudo pacman -Syu
	fi
else
	case "$1" in
		clean)
			if [ -z "$PAC_CLEAN" ]; then
				paccache -rvuk0
			else
				paccache $PAC_CLEAN
			fi
		;;

		config)
			find /etc -regextype posix-extended -regex '.+\.pac(new|save)' 2> /dev/null ;;

		count)
			pacman -Qq | wc -l ;;

		cycle)
			for pkg in $(pacman -Qq); do
				if pactree -l "$pkg" | tail -n +2 | grep -Fqx "$pkg"; then
					echo "$pkg"
				fi
			done
		;;

		explicit)
			print_packages <(pacman -Qqt | sort) ;;

		foreign)
			print_packages <(pacman -Qqm | sort) ;;

		modified)
			for file in $(pacman -Qii | awk '/^MODIFIED/ {print $2}'); do
				pacman -Qqo "$file" | head -c -1; echo "|$file"
			done | column -s '|' -t
		;;

		optional)
			print_packages <(comm -13 <(pacman -Qqt | sort) <(pacman -Qqtt | sort)) ;;

		remove)
			packages="$(pacman -Qqdt)"

			if [ -n "$packages" ]; then
				sudo pacman -Rs $packages
			else
				echo "${BOLD}${GREEN}==> ${RESET}${BOLD}no candidate packages found for pruning"
			fi
		;;

		*)
			echo "$help" ;;
	esac
fi
