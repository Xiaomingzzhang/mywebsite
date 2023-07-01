# This file was generated, do not modify it. # hide
using Plots, IntervalArithmetic
x = range(-2, 2, length=500)
plot()
for α in 1:5
    plot!(x, sinc.(α .* x))
end
savefig(joinpath(@OUTPUT, "sinc.svg")) # hide