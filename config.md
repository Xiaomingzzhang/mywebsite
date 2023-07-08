<!--
Add here global page variables to use throughout your website.
-->
+++
# RSS parameters
generate_rss = true
website_title = "晓明的主页"
website_descr = "Official website for the Julia programming language."
website_url = get(ENV, "JULIA_FRANKLIN_WEBSITE_URL", "https://julialang.org/")
prepath = "mywebsite"
author = "xiaoming"
mintoclevel = 2
hasplotly = false
+++

<!-- @def website_title = "晓明的主页"
@def website_descr = "Example website using Franklin"
@def website_url   = "https://tlienart.github.io/FranklinTemplates.jl/"

@def author = "xiaoming"

@def prepath = "mywebsite"

@def mintoclevel = 2

@def hasplotly = false -->

<!--
Add here files or directories that should be ignored by Franklin, otherwise
these files might be copied and, if markdown, processed by Franklin which
you might not want. Indicate directories by ending the name with a `/`.
-->


<!--
Add here global latex commands to use throughout your pages.
-->
\newcommand{\R}{\mathbb R}
\newcommand{\scal}[1]{\langle #1 \rangle}

\newcommand{\note}[1]{@@note @@title ⚠ Note@@ @@content #1 @@ @@}
\newcommand{\warn}[1]{@@warning @@title ⚠ Warning!@@ @@content #1 @@ @@}
\newcommand{\date}[1]
{@@date
  #1
@@
}
<!-- \newcommand{\df}[2]{
  @@df
  **定义 #1 :** #2
  @@
}

\newcommand{\thm}[2]{
  @@df
  **定理 #1 :** #2
  @@
}

\newcommand{\cor}[2]{
  @@df
  **推论 #1 :** #2
  @@
}

\newcommand{\lm}[2]{
  @@df
  **引理 #1 :**  #2
  @@
}

\newcommand{\prop}[2]{
  @@df
  **命题 #1 :** #2
  @@
}

\newcommand{\rmk}[2]{
  @@warn
  **注 #1 :** #2
  @@
} -->


\newcommand{\chapter}[1]{
# #1
\setlevel{chapter} \increment{}
\setlevel{subsection} \resetcount{} <!-- reset subsection -->
\setlevel{section} \resetcount{}    <!-- reset section -->
\setlevel{subsection}
}
\newcommand{\section}[1]{
## #1

\setlevel{section} \increment{}     <!-- increment section -->
\setlevel{subsection} \resetcount{} <!-- reset subsection -->
}
\newcommand{\subsection}[1]{### #1}

<!-- theorem_name, label, title, statement-->
\newcommand{\theoremcounter}[4]{
\increment{}
\recordTheoremNumber{!#2}
\generateLabel{!#2}
@@df #1 **\getTheoremNumber{}.** \generateTheoremName{!#3} <!-- newline -->
!#4
@@
}

\newcommand{\proof}[1]{
@@proof
**证明:** #1
@@
}


\newcommand{\df}[3]{\theoremcounter{\bold{定义}}{#1}{#2}{#3}}
\newcommand{\rmk}[3]{\theoremcounter{\bold{注}}{#1}{#2}{#3}}
\newcommand{\cor}[3]{\theoremcounter{\bold{推论}}{#1}{#2}{#3}}
\newcommand{\thm}[3]{\theoremcounter{\bold{定理}}{#1}{#2}{#3}}
\newcommand{\prop}[3]{\theoremcounter{\bold{命题}}{#1}{#2}{#3}}
\newcommand{\lm}[3]{\theoremcounter{\bold{引理}}{#1}{#2}{#3}}