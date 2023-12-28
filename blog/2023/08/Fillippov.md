<!-- @def title = "如何用 100 行代码得到一个 Fillippov 系统的求解器"
@def tags = ["Julia", "事件"]
@def author = "张晓明"
@def date = "2023-08-21"
@def page-foot=false -->

+++
mintoclevel = 2
maxtoclevel = 3
title = "如何用 100 行代码得到一个 Fillippov 系统的求解器"
authors = "Mason Protter, Valentin Churavy, Ian Butterworth, and many helpful contributors"
published = "11 July 2023"
rss_pubdate = Date(2023, 08, 21)
rss = """PSA: Thread-local state is no longer recommended; Common misconceptions about threadid() and nthreads()"""
+++

# 如何用 100 行代码得到一个 Fillippov 系统的求解器

Fillippov 是一类分段光滑的 ODE (Ordinary Differential Equation) 系统, 该系统在相空间中存在着一个超曲面, 这个超曲面将矢量场分成两个部分, 这两个部分的矢量场是不同的. Fillippov 系统在一定条件下允许系统的轨线穿过这个超曲面, 甚至允许轨线在这个超曲面上滑移.  这样高度复杂的非光滑给数值计算带来了挑战. 然而凭借 Julia 中的 [DifferentialEquation.jl](https://github.com/SciML/DifferentialEquations.jl) 强大的事件处理能力, 我们将仅用 100 行代码实现这类 Fillippov 系统的求解, 并且该求解器是一般的, 适用于任意维度的 Fillippov 系统.

```
using StaticArrays, OrdinaryDiffEq, Plots, LinearAlgebra

struct ODESol
    solution # ODE solution solved by OrdinaryDiffEq.jl
    state::Symbol # only two symbols are used: :regularmode and :slidemode
end

function fillippov_solve(f1, f2, h, ∇h, v0, p0, t0, tend)
    # it is assumed that f1 is at h(x)<0 and f2 is at h(x)>0
    # f1, f2, h, ∇h are all type of f(u, p, t), the output is a vector
    # initial condition: v0 
    # time interval: t0,tend
    # parameter p0
    # 
    # first define the vector field on the switch surface
    function sv(x, p, t)
        α = dot(∇h(x, p, t), f1(x, p, t)) / dot(∇h(x, p, t), f1(x, p, t) - f2(x, p, t))
        (1 - α) * f1(x, p, t) + α * f2(x, p, t)
    end

    # the hyper surface 
    function newh(x, t, integrator)
        h(x, integrator.p, t)
    end
    # stop the integrator
    function stop(integrator)
        if (integrator.t-integrator.sol.t[1])< 1e-2 # to avoid the 
            nothing
        else
            terminate!(integrator)
        end
    end

    # exit the sliding mode when slide_exit=0
    function slide_exit(x, t, integrator)
        dot(∇h(x, integrator.p, t), f2(x, integrator.p, t)) * dot(∇h(x, integrator.p, t), f1(x, integrator.p, t))
    end

    # main data consist of different solutions at h>0, h<0 and h=0
    sols = Vector{ODESol}(undef, 1)

    if abs(h(v0, p0, t0)) < 1e-10 # if this happen, we assume that the initial condition is on h=0
        prob = ODEProblem(sv, v0, (t0, tend), p0)
        cb = ContinuousCallback(slide_exit, stop)
        firstsol = ODESol(solve(prob, Vern6(), callback=cb), :slidemode)
        sols[1] = firstsol
    elseif h(v0, p0, t0) > 0
        prob = ODEProblem(f2, v0, (t0, tend), p0)
        cb = ContinuousCallback(newh, stop)
        firstsol = ODESol(solve(prob, Vern6(), callback=cb), :regularmode)
        sols[1] = firstsol
    else
        prob = ODEProblem(f1, v0, (t0, tend), p0)
        cb = ContinuousCallback(newh, stop)
        firstsol = ODESol(solve(prob, Vern6(), callback=cb), :regularmode)
        sols[1] = firstsol
    end
    while sols[end].solution.t[end] != tend # if the last of sols's time ≠ tend
        v1 = sols[end].solution.u[end]
        t1 = sols[end].solution.t[end]
        if sols[end].state == :slidemode # if the last solution is in slidemode, we have to determine which vector field it enter
            if abs(dot(∇h(v1, p0, t1), f2(v1, p0, t1))) < 1e-8 && dot(∇h(v1, p0, t1), f1(v1, p0, t1)) > 1e-5
                prob = ODEProblem(f2, v1, (t1, tend), p0)
                cb = ContinuousCallback(newh, stop, repeat_nudge=0.2)
                firstsol = ODESol(solve(prob, Vern6(), callback=cb), :regularmode)
                append!(sols, [firstsol])
            elseif abs(dot(∇h(v1, p0, t1), f1(v1, p0, t1))) < 1e-8 && dot(∇h(v1, p0, t1), f2(v1, p0, t1)) < -1e-5
                prob = ODEProblem(f1, v1, (t1, tend), p0)
                cb = ContinuousCallback(newh, stop, repeat_nudge=0.2)
                firstsol = ODESol(solve(prob, Vern6(), callback=cb), :regularmode)
                append!(sols, [firstsol])
            else
                break
                print("The solution is not defined on state $v1 and time $t1")
            end
        else
            if dot(∇h(v1, p0, t1), f1(v1, p0, t1)) * dot(∇h(v1, p0, t1), f2(v1, p0, t1)) > 0 # crossing h=0
                if dot(∇h(v1, p0, t1), f1(v1, p0, t1)) > 0
                    prob = ODEProblem(f2, v1, (t1, tend), p0)
                    cb = ContinuousCallback(newh, stop, repeat_nudge=0.2)
                    firstsol = ODESol(solve(prob, Vern6(), callback=cb), :regularmode)
                    append!(sols, [firstsol])
                else
                    prob = ODEProblem(f1, v1, (t1, tend), p0)
                    cb = ContinuousCallback(newh, stop, repeat_nudge=0.2)
                    firstsol = ODESol(solve(prob, Vern6(), callback=cb), :regularmode)
                    append!(sols, [firstsol])
                end
            else # entering h=0
                prob = ODEProblem(sv, v1, (t1, tend), p0)
                cb = ContinuousCallback(slide_exit, stop)
                firstsol = ODESol(solve(prob, Vern6(), callback=cb), :slidemode)
                append!(sols, [firstsol])
            end
        end
    end
    sols
end
```