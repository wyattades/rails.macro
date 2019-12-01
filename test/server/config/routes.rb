Rails.application.routes.draw do
  to = 'root#index'
  root to
  get 'things', to: to
  get 'thing/:id', to: to, as: :thing
  get 'thing(/thingy)/:id', to: to, as: :thingy
  get 'foo/:bar(/:fizz/:buzz)', to: to, as: :foo_bar
  get 'foo/:bar((/bark/:fizz)/:buzz)', to: to, as: :foo_bark
  get 'wild(/*blob)', to: to, as: :wild_a
  get 'wild/(*blob)', to: to, as: :wild_b
  get 'wild/*blob', to: to, as: :wild_c
end
