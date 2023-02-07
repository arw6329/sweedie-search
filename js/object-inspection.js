
export function* fetch_all_instance_properties_from_class_matching(cls, regex) {
    yield* Object.entries(Object.getOwnPropertyDescriptors(cls.prototype))
        .filter(entry => regex.test(entry[0])).map(entry => ({
            key: entry[0],
            descriptor: entry[1]
        })
    )
    if(Object.getPrototypeOf(cls) !== null && Object.getPrototypeOf(cls).prototype !== undefined) {
        yield* fetch_all_instance_properties_from_class_matching(Object.getPrototypeOf(cls), regex)
    }
}