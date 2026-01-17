I want an app to be used as a kind of checklist for the house hunting process.
I should be able to add a house and details that are important to me. I'm currently looking at 1 bedroom houses in the 300-350k price range in australia. These are some fields I care about:
- website url
- location
- distance to train station
- distance to nearest coles/woolies
- distance to monash university (where I work)
- distance to nearest anytime fitness gym
- is a car park included/nearby
- how much additional cost for a car park (if known)
- the corporate body fees annual cost
- the estimate going rate if I was to rent it out per week
- the estimated cost of the house
- square metres
- num bedrooms (usually 1)
- num bathrooms (usually 1)
- age of house
- previous selling/rent price

The above fields are usually something that can be done before the inspection.
I also want some fields for once the house passes the first stage and we decide to inspect it (maybe also having a field for the status like "saved", "inspected", "offered" not sure what else)
- number of desks we can fit
- space for laundry
- floor level
- good lighting
- has dishwasher
- stove type (gas/electric)
- is quiet area

Let me know if there are other fields I may have missed.

I also want to add date time fields for when the house will have an available inspection, this will be useful for another feature.

The website should be password protected since I want to deploy it online for me and my girlfriend. This can be set with an env variable.

I want to be able to make and save custom rules for filtering down my options. e.g. A rule called "Transport friendly" and then we build an if statement using fields like "has car park" or "distance to train station < 5km"
Each separate field should have it's own comparison operator, e.g. numbers will use number comparisons, booleans. I think location can get complex so maybe we can leave this out for now.
I also want a head to head comparison where I can search up two houses and compare them against each other.
We also just need general filtering

I also want for the data entry to have a connection to https://openrouter.ai/ that given the REA website url can help fill out the rest of the fields.
I'm not sure if we'll need google maps integration to do the distance calculations or if AI has this tooling built in. If google maps is necessary maybe we can also do google maps filtering.

The final part is an inspection day planner. Given the inspection date/times for all of the houses that are saved and we want to inspect, I want an algorithm that can plan out which houses we can inspect and when.
It should take into account the distance for driving to each separate house, and like a 15 minute buffer in between to give time for inspecting and parking (this can be configurable).

Maybe google maps integration is necessary.
